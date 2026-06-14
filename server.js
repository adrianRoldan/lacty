import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import session from 'express-session';
import connectSqlite3 from 'connect-sqlite3';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || join(__dirname, 'lacty.db');

const newId = () => randomBytes(9).toString('base64url');
const newInvite = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join('');

// Secret de sesión persistente: variable de entorno, o un archivo local generado
// una sola vez (nunca hardcodeado ni en el repositorio).
function getSessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const f = join(__dirname, '.session-secret');
  if (existsSync(f)) return readFileSync(f, 'utf-8').trim();
  const secret = randomBytes(32).toString('hex');
  writeFileSync(f, secret, { mode: 0o600 });
  return secret;
}

const SQLiteStore = connectSqlite3(session);

const app = express();
app.set('trust proxy', 1); // detrás de cloudflared/proxy: usar la IP real para el rate limit
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: __dirname }),
  secret: getSessionSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
  },
}));

// Rate limiting para login y registro: frena ataques de fuerza bruta.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,                  // 20 intentos por IP en la ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' },
});

// ── Database setup ────────────────────────────────────────────────────────────

const db = new Database(DB_PATH);

const DATA_TABLES = ['feedings', 'rests', 'weights', 'vitamind', 'probiotics', 'massages', 'consultations', 'calendar'];

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    account_id    TEXT,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS babies (
    id         TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    data       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS config   (id TEXT PRIMARY KEY, data TEXT NOT NULL);
  ${DATA_TABLES.map((t) => `CREATE TABLE IF NOT EXISTS ${t} (id TEXT PRIMARY KEY, data TEXT NOT NULL);`).join('\n  ')}
`);

// Añade columnas baby_id / account_id a esquemas previos (idempotente)
function ensureColumn(table, column, type = 'TEXT') {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}
ensureColumn('users', 'account_id');
ensureColumn('accounts', 'invite_code');
ensureColumn('accounts', 'name');
for (const t of DATA_TABLES) {
  ensureColumn(t, 'baby_id');
  db.exec(`CREATE INDEX IF NOT EXISTS idx_${t}_baby ON ${t}(baby_id)`);
}

// Backfill de códigos de invitación para cuentas que no lo tengan
for (const a of db.prepare(`SELECT id FROM accounts WHERE invite_code IS NULL`).all()) {
  db.prepare(`UPDATE accounts SET invite_code = ? WHERE id = ?`).run(newInvite(), a.id);
}

// ── Migración single-tenant → multi-tenant (idempotente) ────────────────────────
// Si hay usuarios sin cuenta, se crea una cuenta, se les asigna, se crea un bebé
// con la config existente y se vincula todo el histórico a ese bebé.
(function migrateToMultiTenant() {
  const orphanUsers = db.prepare(`SELECT * FROM users WHERE account_id IS NULL`).all();
  if (orphanUsers.length === 0) return;

  const accountId = newId();
  db.prepare(`INSERT INTO accounts (id) VALUES (?)`).run(accountId);
  db.prepare(`UPDATE users SET account_id = ? WHERE account_id IS NULL`).run(accountId);

  // Bebé a partir de la config existente
  const cfgRow = db.prepare(`SELECT data FROM config LIMIT 1`).get();
  const cfg = cfgRow ? JSON.parse(cfgRow.data) : {};
  const babyId = newId();
  const babyData = { ...cfg, id: babyId };
  db.prepare(`INSERT INTO babies (id, account_id, data) VALUES (?, ?, ?)`)
    .run(babyId, accountId, JSON.stringify(babyData));

  // Vincular todo el histórico al bebé
  for (const t of DATA_TABLES) {
    db.prepare(`UPDATE ${t} SET baby_id = ? WHERE baby_id IS NULL`).run(babyId);
  }
  console.log(`✓ Migrado a multi-tenant: cuenta ${accountId}, bebé ${babyId}, ${orphanUsers.length} usuario(s)`);
})();

// ── Realtime: SSE + contadores de versión, segmentados por cuenta ───────────────

const sseClients = new Set(); // { res, accountId }
const revsByAccount = new Map(); // accountId -> { recurso: n }

function getRevs(accountId) {
  if (!revsByAccount.has(accountId)) {
    revsByAccount.set(accountId, Object.fromEntries([...DATA_TABLES, 'babies'].map((t) => [t, 0])));
  }
  return revsByAccount.get(accountId);
}

function broadcast(resource, accountId, originId) {
  const r = getRevs(accountId);
  if (resource in r) r[resource]++;
  const payload = `event: change\ndata: ${JSON.stringify({ resource, originId })}\n\n`;
  for (const c of sseClients) {
    if (c.accountId !== accountId) continue;
    try { c.res.write(payload); } catch { sseClients.delete(c); }
  }
}

// ── Generic CRUD por bebé (aislado) ─────────────────────────────────────────────

function makeRouter(table) {
  const r = express.Router();

  r.get('/', (req, res) =>
    res.json(
      db.prepare(`SELECT data FROM ${table} WHERE baby_id = ?`).all(req.babyId).map((row) => JSON.parse(row.data))
    )
  );

  r.post('/', (req, res) => {
    db.prepare(`INSERT OR REPLACE INTO ${table} (id, baby_id, data) VALUES (?, ?, ?)`)
      .run(req.body.id, req.babyId, JSON.stringify(req.body));
    res.status(201).json(req.body);
    broadcast(table, req.accountId, req.get('X-Client-Id'));
  });

  r.put('/:id', (req, res) => {
    // No permitir pisar registros de otro bebé
    const existing = db.prepare(`SELECT baby_id FROM ${table} WHERE id = ?`).get(req.params.id);
    if (existing && existing.baby_id !== req.babyId) return res.status(403).json({ error: 'Prohibido' });
    const item = { ...req.body, id: req.params.id };
    db.prepare(`INSERT OR REPLACE INTO ${table} (id, baby_id, data) VALUES (?, ?, ?)`)
      .run(item.id, req.babyId, JSON.stringify(item));
    res.json(item);
    broadcast(table, req.accountId, req.get('X-Client-Id'));
  });

  r.delete('/:id', (req, res) => {
    db.prepare(`DELETE FROM ${table} WHERE id = ? AND baby_id = ?`).run(req.params.id, req.babyId);
    res.status(200).json({});
    broadcast(table, req.accountId, req.get('X-Client-Id'));
  });

  return r;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

// Info pública mínima para la pantalla de login (sin datos sensibles)
app.get('/api/app-info', (_, res) => res.json({ app: 'Lacty' }));

app.get('/api/auth/me', (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'No autenticado' });
  res.json({ username: req.session.username, accountId: req.session.accountId });
});

app.post('/api/auth/signup', authLimiter, async (req, res) => {
  const { username, password, babyName, inviteCode } = req.body ?? {};
  if (!username || !password) return res.status(400).json({ error: 'Faltan campos' });
  if (String(password).length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  const exists = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
  if (exists) return res.status(409).json({ error: 'Ese usuario ya existe' });

  const userId = newId();
  const hash = bcrypt.hashSync(String(password), 12);
  let accountId;

  if (inviteCode) {
    // Unirse a una cuenta existente
    const acc = db.prepare(`SELECT id FROM accounts WHERE invite_code = ?`).get(String(inviteCode).trim().toUpperCase());
    if (!acc) return res.status(404).json({ error: 'Código de invitación no válido' });
    accountId = acc.id;
    db.prepare(`INSERT INTO users (id, account_id, username, password_hash) VALUES (?, ?, ?, ?)`)
      .run(userId, accountId, username, hash);
  } else {
    // Crear cuenta nueva + primer bebé
    accountId = newId();
    const babyId = newId();
    const tx = db.transaction(() => {
      db.prepare(`INSERT INTO accounts (id, invite_code) VALUES (?, ?)`).run(accountId, newInvite());
      db.prepare(`INSERT INTO users (id, account_id, username, password_hash) VALUES (?, ?, ?, ?)`)
        .run(userId, accountId, username, hash);
      const babyData = { id: babyId, name: babyName || undefined, daysOfLifeAtSetup: 1, setupDate: new Date().toISOString().slice(0, 10) };
      db.prepare(`INSERT INTO babies (id, account_id, data) VALUES (?, ?, ?)`)
        .run(babyId, accountId, JSON.stringify(babyData));
    });
    tx();
  }

  req.session.userId = userId;
  req.session.username = username;
  req.session.accountId = accountId;
  res.status(201).json({ ok: true, username, accountId });
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) return res.status(400).json({ error: 'Faltan campos' });
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.accountId = user.account_id;
  res.json({ ok: true, username: user.username, accountId: user.account_id });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// Protege /api excepto /api/auth/* y /api/app-info
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/') || req.path === '/app-info') return next();
  if (!req.session?.userId) return res.status(401).json({ error: 'No autorizado' });
  req.accountId = req.session.accountId;
  next();
});

// ── Versiones (polling de respaldo) ─────────────────────────────────────────────

app.get('/api/version', (req, res) => res.json(getRevs(req.accountId)));

// ── SSE stream ──────────────────────────────────────────────────────────────────

app.get('/api/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();
  res.write('retry: 3000\n\n');

  const client = { res, accountId: req.accountId };
  sseClients.add(client);
  const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch { /* noop */ } }, 25000);
  req.on('close', () => { clearInterval(ping); sseClients.delete(client); });
});

// ── Cuenta (miembros + código de invitación) ────────────────────────────────────

app.get('/api/account', (req, res) => {
  const acc = db.prepare(`SELECT id, invite_code, name FROM accounts WHERE id = ?`).get(req.accountId);
  const rows = db.prepare(`SELECT id, username FROM users WHERE account_id = ? ORDER BY created_at`).all(req.accountId);
  const adminId = rows[0]?.id; // el creador (más antiguo) es admin
  res.json({
    id: acc?.id,
    name: acc?.name ?? null,
    inviteCode: acc?.invite_code ?? null,
    isAdmin: req.session.userId === adminId,
    members: rows.map((m) => ({
      id: m.id,
      username: m.username,
      isAdmin: m.id === adminId,
      isMe: m.id === req.session.userId,
    })),
  });
});

app.put('/api/account', (req, res) => {
  const name = (req.body?.name ?? '').toString().trim() || null;
  db.prepare(`UPDATE accounts SET name = ? WHERE id = ?`).run(name, req.accountId);
  res.json({ ok: true, name });
});

// Expulsar a un miembro (solo el admin, no a sí mismo)
app.delete('/api/account/members/:userId', (req, res) => {
  const rows = db.prepare(`SELECT id FROM users WHERE account_id = ? ORDER BY created_at`).all(req.accountId);
  const adminId = rows[0]?.id;
  if (req.session.userId !== adminId) return res.status(403).json({ error: 'Solo el administrador puede expulsar' });
  if (req.params.userId === req.session.userId) return res.status(400).json({ error: 'No puedes expulsarte a ti mismo' });
  const target = db.prepare(`SELECT account_id FROM users WHERE id = ?`).get(req.params.userId);
  if (!target || target.account_id !== req.accountId) return res.status(404).json({ error: 'Miembro no encontrado' });
  db.prepare(`DELETE FROM users WHERE id = ?`).run(req.params.userId);
  res.json({ ok: true });
});

// Salir de la cuenta uno mismo (no permitido si es el único miembro)
app.post('/api/account/leave', (req, res) => {
  const count = db.prepare(`SELECT COUNT(*) AS n FROM users WHERE account_id = ?`).get(req.accountId).n;
  if (count <= 1) return res.status(400).json({ error: 'Eres el único miembro; no puedes abandonar la cuenta' });
  db.prepare(`DELETE FROM users WHERE id = ?`).run(req.session.userId);
  req.session.destroy(() => res.json({ ok: true }));
});

// ── Bebés (por cuenta) ───────────────────────────────────────────────────────────

app.get('/api/babies', (req, res) => {
  const rows = db.prepare(`SELECT data FROM babies WHERE account_id = ? ORDER BY created_at`).all(req.accountId);
  res.json(rows.map((r) => JSON.parse(r.data)));
});

app.post('/api/babies', (req, res) => {
  const id = req.body.id || newId();
  const data = { ...req.body, id };
  db.prepare(`INSERT OR REPLACE INTO babies (id, account_id, data) VALUES (?, ?, ?)`)
    .run(id, req.accountId, JSON.stringify(data));
  res.status(201).json(data);
  broadcast('babies', req.accountId, req.get('X-Client-Id'));
});

app.put('/api/babies/:id', (req, res) => {
  const row = db.prepare(`SELECT account_id FROM babies WHERE id = ?`).get(req.params.id);
  if (!row || row.account_id !== req.accountId) return res.status(403).json({ error: 'Prohibido' });
  const data = { ...req.body, id: req.params.id };
  db.prepare(`UPDATE babies SET data = ? WHERE id = ?`).run(JSON.stringify(data), req.params.id);
  res.json(data);
  broadcast('babies', req.accountId, req.get('X-Client-Id'));
});

app.delete('/api/babies/:id', (req, res) => {
  const row = db.prepare(`SELECT account_id FROM babies WHERE id = ?`).get(req.params.id);
  if (!row || row.account_id !== req.accountId) return res.status(403).json({ error: 'Prohibido' });
  const tx = db.transaction(() => {
    for (const t of DATA_TABLES) db.prepare(`DELETE FROM ${t} WHERE baby_id = ?`).run(req.params.id);
    db.prepare(`DELETE FROM babies WHERE id = ?`).run(req.params.id);
  });
  tx();
  res.status(200).json({});
  broadcast('babies', req.accountId, req.get('X-Client-Id'));
});

// ── Middleware de bebé: valida que X-Baby-Id pertenece a la cuenta ───────────────

function requireBaby(req, res, next) {
  const babyId = req.get('X-Baby-Id');
  if (!babyId) return res.status(400).json({ error: 'Falta bebé' });
  const row = db.prepare(`SELECT account_id FROM babies WHERE id = ?`).get(babyId);
  if (!row || row.account_id !== req.accountId) return res.status(403).json({ error: 'Bebé no autorizado' });
  req.babyId = babyId;
  next();
}

// ── Rutas de datos (aisladas por bebé) ──────────────────────────────────────────

for (const t of DATA_TABLES) {
  app.use(`/api/${t}`, requireBaby, makeRouter(t));
}

// ── Static frontend (production build) ────────────────────────────────────────

const DIST = join(__dirname, 'dist');
if (existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('/*path', (_, res) => res.sendFile(join(DIST, 'index.html')));
}

app.listen(PORT, () =>
  console.log(`Lacty en http://localhost:${PORT}`)
);
