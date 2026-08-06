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
import webpush from 'web-push';
import sanitizeHtml from 'sanitize-html';
import { renderArticulo, renderIndice, renderSitemap, render404 } from './lib/guias-render.mjs';
import { renderReferencias } from './lib/referencias-render.mjs';
import { ARTICULOS_INICIALES } from './lib/guias-seed.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DB_PATH = process.env.DB_PATH || join(DATA_DIR, 'lacty.db');

const newId = () => randomBytes(9).toString('base64url');
const newInvite = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join('');
const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// Secret de sesión persistente: variable de entorno, o un archivo local generado
// una sola vez (nunca hardcodeado ni en el repositorio).
function getSessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const f = join(DATA_DIR, '.session-secret');
  if (existsSync(f)) return readFileSync(f, 'utf-8').trim();
  const secret = randomBytes(32).toString('hex');
  writeFileSync(f, secret, { mode: 0o600 });
  return secret;
}

function getVapidKeys() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  const f = join(DATA_DIR, '.vapid-keys.json');
  if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf-8'));
  const keys = webpush.generateVAPIDKeys();
  writeFileSync(f, JSON.stringify(keys), { mode: 0o600 });
  return keys;
}

const vapidKeys = getVapidKeys();
webpush.setVapidDetails('mailto:admin@lacty.app', vapidKeys.publicKey, vapidKeys.privateKey);

const SQLiteStore = connectSqlite3(session);

const app = express();
app.set('trust proxy', 1); // detrás de un proxy: usar la IP real para el rate limit
app.disable('x-powered-by'); // no anunciar la tecnología del servidor

// CORS restringido a los dominios propios.
//
// Antes era `origin: true`, que refleja cualquier origen. Combinado con
// `credentials: true`, eso permitía que una web de terceros hiciera peticiones
// autenticadas con la sesión del usuario y leyera la respuesta. En producción
// la app se sirve desde el mismo origen que la API, así que no hace falta CORS
// abierto; solo se permiten los dominios propios y, en desarrollo, la red local
// para poder trabajar con Vite desde el móvil.
const ORIGENES_PERMITIDOS = [
  'https://lacty.es',
  'https://www.lacty.es',
  'https://app.lacty.es',
];
const esOrigenLocal = (o) => /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(o);

app.use(cors({
  origin(origin, cb) {
    // Sin cabecera Origin: mismo origen, curl, apps nativas… no es CORS.
    if (!origin) return cb(null, true);
    if (ORIGENES_PERMITIDOS.includes(origin)) return cb(null, true);
    if (process.env.NODE_ENV !== 'production' && esOrigenLocal(origin)) return cb(null, true);
    // Se responde sin cabeceras CORS (no con un error) para que el navegador
    // bloquee la lectura sin devolver un 500 al cliente.
    return cb(null, false);
  },
  credentials: true,
}));

app.use(express.json());
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: DATA_DIR }),
  secret: getSessionSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // Explícito en vez de depender del valor por defecto del navegador: impide
    // que la cookie viaje en peticiones de otro sitio. Se usa "lax" y no
    // "strict" para que al llegar desde un enlace externo la sesión siga viva.
    sameSite: 'lax',
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

const DATA_TABLES = ['feedings', 'rests', 'weights', 'heights', 'headcircs', 'vitamind', 'probiotics', 'massages', 'consultations', 'calendar', 'milestones', 'vaccines', 'diapers', 'medications', 'medplans', 'walks', 'baths'];

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    account_id    TEXT,
    username      TEXT UNIQUE NOT NULL,
    email         TEXT,
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
ensureColumn('users', 'role', "TEXT NOT NULL DEFAULT 'user'");
ensureColumn('users', 'family_role', "TEXT NOT NULL DEFAULT 'editor'");
ensureColumn('users', 'last_login_at');
ensureColumn('users', 'email');
// Preferencia personal: qué diseño del timeline de «Hoy» ve cada usuario, y si
// ya se le ofreció probar la línea de tiempo (el aviso se enseña una sola vez).
ensureColumn('users', 'timeline_design', "TEXT NOT NULL DEFAULT 'clasico'");
ensureColumn('users', 'timeline_prompt_seen', 'INTEGER NOT NULL DEFAULT 0');
// Índice único parcial: permite NULL para usuarios antiguos sin email, pero
// impide duplicados entre los que sí lo tienen.
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL`);
ensureColumn('accounts', 'invite_code');
ensureColumn('accounts', 'name');
for (const t of DATA_TABLES) {
  ensureColumn(t, 'baby_id');
  db.exec(`CREATE INDEX IF NOT EXISTS idx_${t}_baby ON ${t}(baby_id)`);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id           TEXT PRIMARY KEY,
    account_id   TEXT NOT NULL,
    endpoint     TEXT NOT NULL UNIQUE,
    subscription_json TEXT NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS notification_prefs (
    account_id             TEXT NOT NULL,
    baby_id                TEXT NOT NULL,
    feeding_threshold_mins INTEGER NOT NULL DEFAULT 180,
    rest_threshold_mins    INTEGER NOT NULL DEFAULT 120,
    last_feeding_notif_at  TEXT,
    last_rest_notif_at     TEXT,
    PRIMARY KEY (account_id, baby_id)
  );
`);

// Deben ir después de crear push_subscriptions: si se llaman antes, una base de
// datos nueva revienta al arrancar porque la tabla todavía no existe.
ensureColumn('push_subscriptions', 'user_id');
ensureColumn('push_subscriptions', 'user_agent');

ensureColumn('notification_prefs', 'massage_threshold_mins', 'INTEGER NOT NULL DEFAULT 15');
ensureColumn('notification_prefs', 'last_massage_notif_at', 'TEXT');

// Último aviso enviado por «cosa que se repite»: cada pauta de medicación, la
// vitamina D y el probiótico de cada bebé. Como el número de claves crece con
// los datos, no caben como columnas de notification_prefs.
db.exec(`
  CREATE TABLE IF NOT EXISTS notif_state (
    key           TEXT PRIMARY KEY,
    last_notif_at TEXT NOT NULL
  );
`);

const ultimoAviso = (key) =>
  db.prepare(`SELECT last_notif_at FROM notif_state WHERE key = ?`).get(key)?.last_notif_at ?? null;

const anotarAviso = (key) =>
  db.prepare(`INSERT INTO notif_state (key, last_notif_at) VALUES (?, ?)
              ON CONFLICT(key) DO UPDATE SET last_notif_at = excluded.last_notif_at`)
    .run(key, new Date().toISOString());

// ── Guías (contenido público de lacty.es/guias/) ──────────────────────────────
// Los artículos se escriben desde el panel de administración y se guardan aquí;
// el HTML público se genera al vuelo en lib/guias-render.mjs.
db.exec(`
  CREATE TABLE IF NOT EXISTS articulos (
    id                TEXT PRIMARY KEY,
    slug              TEXT NOT NULL UNIQUE,
    titulo            TEXT NOT NULL,
    descripcion       TEXT NOT NULL,
    resumen           TEXT NOT NULL,
    emoji             TEXT,
    contenido         TEXT NOT NULL,
    publicado         INTEGER NOT NULL DEFAULT 0,
    fecha_publicacion TEXT,
    creado_at         TEXT NOT NULL DEFAULT (datetime('now')),
    actualizado_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_articulos_publicado ON articulos(publicado, fecha_publicacion);
`);

// Publicación de guías escritas fuera del panel (por ejemplo, redactadas junto
// al código). Cada una se aplica una sola vez y queda registrada: si después
// la editas o la borras desde el panel, no se sobrescribe ni reaparece.
db.exec(`
  CREATE TABLE IF NOT EXISTS migraciones_contenido (
    id          TEXT PRIMARY KEY,
    aplicada_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

(function sembrarArticulos() {
  const yaAplicada = db.prepare(`SELECT 1 FROM migraciones_contenido WHERE id = ?`);
  const marcar     = db.prepare(`INSERT OR IGNORE INTO migraciones_contenido (id) VALUES (?)`);
  const existeSlug = db.prepare(`SELECT 1 FROM articulos WHERE slug = ?`);
  const insertar   = db.prepare(`
    INSERT INTO articulos (id, slug, titulo, descripcion, resumen, emoji, contenido, publicado, fecha_publicacion)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  let nuevas = 0;
  const tx = db.transaction(() => {
    for (const a of ARTICULOS_INICIALES) {
      const clave = `articulo:${a.slug}`;
      if (yaAplicada.get(clave)) continue;
      // Si el artículo ya existe (venía de la siembra antigua), solo se anota
      // la migración para no volver a intentarlo.
      if (!existeSlug.get(a.slug)) {
        insertar.run(newId(), a.slug, a.titulo, a.descripcion, a.resumen, a.emoji ?? null, a.contenido, a.fecha);
        nuevas++;
      }
      marcar.run(clave);
    }
  });
  tx();
  if (nuevas > 0) console.log(`✓ Publicadas ${nuevas} guía(s) nueva(s) en /guias/`);
})();

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

// ── Guías: páginas públicas ───────────────────────────────────────────────────
// Se sirven antes que cualquier middleware de sesión: son contenido abierto
// que también tiene que ver Googlebot.

const SELECT_PUBLICADOS = `
  SELECT * FROM articulos WHERE publicado = 1
  ORDER BY COALESCE(fecha_publicacion, creado_at) DESC
`;

// Express no distingue /guias de /guias/ (strict routing está desactivado),
// así que una sola ruta cubre ambas.
// Los rangos orientativos que usa la app, servidos desde los mismos datos
// (lib/reference-data.mjs) para que no haya dos versiones de la tabla.
app.get('/referencias', (_req, res) => {
  res.type('html').send(renderReferencias());
});
app.get('/referencias.html', (_req, res) => res.redirect(301, '/referencias'));

app.get('/guias/', (_req, res) => {
  const articulos = db.prepare(SELECT_PUBLICADOS).all();
  res.type('html').send(renderIndice(articulos));
});

app.get('/guias/:slug.html', (req, res, next) => {
  const art = db.prepare(`SELECT * FROM articulos WHERE slug = ? AND publicado = 1`).get(req.params.slug);
  if (!art) return next();
  const relacionados = db.prepare(`
    SELECT slug, titulo, resumen, emoji FROM articulos
    WHERE publicado = 1 AND slug != ?
    ORDER BY COALESCE(fecha_publicacion, creado_at) DESC LIMIT 2
  `).all(req.params.slug);
  res.type('html').send(renderArticulo(art, relacionados));
});

// Sin extensión: se redirige a la URL canónica con .html, que es la que Google
// ya tiene indexada, para no partir el posicionamiento en dos direcciones.
app.get('/guias/:slug', (req, res, next) => {
  if (req.params.slug.includes('.')) return next();
  const existe = db.prepare(`SELECT 1 FROM articulos WHERE slug = ? AND publicado = 1`).get(req.params.slug);
  if (!existe) return next();
  res.redirect(301, `/guias/${req.params.slug}.html`);
});

// Cualquier otra ruta bajo /guias/ es un 404 de verdad. Sin esto caería en el
// catch-all de la SPA y devolvería un 200 con la app: un "soft 404" que Google
// penaliza porque indexa páginas que en realidad no existen.
app.use('/guias', (_req, res) => {
  res.status(404).type('html').send(render404());
});

// El sitemap se vuelca a disco para que lo sirva el servidor web como fichero
// estático. Si dependiera de la app, cada despliegue abriría una ventana de
// segundos en la que Google podría leerlo y anotar un fallo que luego tarda
// días en reintentar. Como fichero está disponible siempre.
const RUTA_SITEMAP = join(__dirname, 'landing', 'sitemap.xml');

function escribirSitemap() {
  try {
    const articulos = db.prepare(SELECT_PUBLICADOS).all();
    writeFileSync(RUTA_SITEMAP, renderSitemap(articulos));
  } catch (e) {
    // No es crítico: la ruta dinámica de abajo sigue sirviéndolo.
    console.warn(`No se pudo escribir ${RUTA_SITEMAP}: ${e.message}`);
  }
}

// Se mantiene la ruta dinámica como red de seguridad, por si el fichero no se
// pudiera escribir o el servidor web no estuviera sirviendo ese directorio.
app.get('/sitemap.xml', (_req, res) => {
  const articulos = db.prepare(SELECT_PUBLICADOS).all();
  res.type('application/xml').send(renderSitemap(articulos));
});

// ── Auth ──────────────────────────────────────────────────────────────────────

// Info pública mínima para la pantalla de login (sin datos sensibles)
app.get('/api/health', (_, res) => res.json({ ok: true }));
app.get('/api/app-info', (_, res) => res.json({ app: 'Lacty' }));

app.get('/api/auth/me', (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'No autenticado' });
  const user = db.prepare(`SELECT email, role, family_role, timeline_design, timeline_prompt_seen FROM users WHERE id = ?`).get(req.session.userId);
  res.json({
    username: req.session.username,
    email: user?.email ?? null,
    accountId: req.session.accountId,
    role: user?.role ?? 'user',
    familyRole: user?.family_role ?? 'editor',
    timelineDesign: user?.timeline_design ?? 'clasico',
    timelinePromptSeen: !!user?.timeline_prompt_seen,
    impersonating: !!req.session.originalUserId,
    originalUsername: req.session.originalUsername ?? null,
  });
});

// Preferencias personales del usuario (de momento, todo sobre el timeline).
app.put('/api/auth/preferences', (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'No autenticado' });
  const { timelineDesign, timelinePromptSeen } = req.body ?? {};
  if (timelineDesign !== undefined) {
    if (timelineDesign !== 'clasico' && timelineDesign !== 'rail') {
      return res.status(400).json({ error: 'Diseño no válido' });
    }
    db.prepare(`UPDATE users SET timeline_design = ? WHERE id = ?`).run(timelineDesign, req.session.userId);
  }
  if (timelinePromptSeen !== undefined) {
    db.prepare(`UPDATE users SET timeline_prompt_seen = ? WHERE id = ?`)
      .run(timelinePromptSeen ? 1 : 0, req.session.userId);
  }
  res.json({ ok: true });
});

// El propio usuario edita su nombre de usuario y/o email.
app.put('/api/auth/profile', (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'No autenticado' });
  const { username, email, password } = req.body ?? {};
  const trimmedUsername = String(username ?? '').trim();
  if (!trimmedUsername || !email) return res.status(400).json({ error: 'Faltan campos' });
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) return res.status(400).json({ error: 'Email no válido' });
  if (password && String(password).length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

  const dupUsername = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(trimmedUsername, req.session.userId);
  if (dupUsername) return res.status(409).json({ error: 'Ese usuario ya existe' });
  const dupEmail = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(normalizedEmail, req.session.userId);
  if (dupEmail) return res.status(409).json({ error: 'Ese email ya está registrado' });

  if (password) {
    const hash = bcrypt.hashSync(String(password), 12);
    db.prepare(`UPDATE users SET username = ?, email = ?, password_hash = ? WHERE id = ?`)
      .run(trimmedUsername, normalizedEmail, hash, req.session.userId);
  } else {
    db.prepare(`UPDATE users SET username = ?, email = ? WHERE id = ?`).run(trimmedUsername, normalizedEmail, req.session.userId);
  }
  req.session.username = trimmedUsername;
  res.json({ ok: true, username: trimmedUsername, email: normalizedEmail });
});

app.post('/api/auth/signup', authLimiter, async (req, res) => {
  const { username, email, password, babyName, inviteCode } = req.body ?? {};
  if (!username || !email || !password) return res.status(400).json({ error: 'Faltan campos' });
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) return res.status(400).json({ error: 'Email no válido' });
  if (String(password).length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  const exists = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
  if (exists) return res.status(409).json({ error: 'Ese usuario ya existe' });
  const emailExists = db.prepare('SELECT 1 FROM users WHERE email = ?').get(normalizedEmail);
  if (emailExists) return res.status(409).json({ error: 'Ese email ya está registrado' });

  const userId = newId();
  const hash = bcrypt.hashSync(String(password), 12);
  let accountId;

  if (inviteCode) {
    // Unirse a una cuenta existente
    const acc = db.prepare(`SELECT id FROM accounts WHERE invite_code = ?`).get(String(inviteCode).trim().toUpperCase());
    if (!acc) return res.status(404).json({ error: 'Código de invitación no válido' });
    accountId = acc.id;
    db.prepare(`INSERT INTO users (id, account_id, username, email, password_hash) VALUES (?, ?, ?, ?, ?)`)
      .run(userId, accountId, username, normalizedEmail, hash);
  } else {
    // Crear cuenta nueva + primer bebé
    accountId = newId();
    const babyId = newId();
    const tx = db.transaction(() => {
      db.prepare(`INSERT INTO accounts (id, invite_code) VALUES (?, ?)`).run(accountId, newInvite());
      db.prepare(`INSERT INTO users (id, account_id, username, email, password_hash) VALUES (?, ?, ?, ?, ?)`)
        .run(userId, accountId, username, normalizedEmail, hash);
      const babyData = { id: babyId, name: babyName || undefined, daysOfLifeAtSetup: 1, setupDate: new Date().toISOString().slice(0, 10) };
      db.prepare(`INSERT INTO babies (id, account_id, data) VALUES (?, ?, ?)`)
        .run(babyId, accountId, JSON.stringify(babyData));
    });
    tx();
  }

  db.prepare(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`).run(userId);
  req.session.userId = userId;
  req.session.username = username;
  req.session.accountId = accountId;
  req.session.role = 'user';
  res.status(201).json({ ok: true, username, accountId, role: 'user' });
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) return res.status(400).json({ error: 'Faltan campos' });
  // El campo "username" del login acepta tanto el nombre de usuario como el email.
  const identifier = String(username).trim();
  const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?')
    .get(identifier, identifier.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });
  db.prepare(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`).run(user.id);
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.accountId = user.account_id;
  req.session.role = user.role ?? 'user';
  req.session.familyRole = user.family_role ?? 'editor';
  res.json({ ok: true, username: user.username, accountId: user.account_id, role: user.role ?? 'user' });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// Protege /api excepto /api/auth/* y /api/app-info
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/') || req.path === '/app-info' || req.path === '/push/vapid-key') return next();
  if (!req.session?.userId) return res.status(401).json({ error: 'No autorizado' });
  req.accountId = req.session.accountId;
  // Viewers: solo lectura (GET + SSE permitidos, todo lo demás bloqueado)
  // Lee de la BD en cada request para reflejar cambios de rol inmediatos
  if (req.method !== 'GET') {
    if (req.path === '/auth/logout' || req.path === '/account/leave') return next();
    const user = db.prepare(`SELECT family_role FROM users WHERE id = ?`).get(req.session.userId);
    if ((user?.family_role ?? 'editor') === 'viewer') {
      return res.status(403).json({ error: 'Tu cuenta es de solo lectura' });
    }
  }
  next();
});

// ── Admin ─────────────────────────────────────────────────────────────────────

function requireAdmin(req, res, next) {
  if ((req.session?.role ?? 'user') !== 'admin') return res.status(403).json({ error: 'No autorizado' });
  next();
}

app.get('/api/admin/users', requireAdmin, (_req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.email, u.role, u.family_role, u.account_id, u.created_at, u.last_login_at,
           a.invite_code, a.name AS account_name
    FROM users u
    LEFT JOIN accounts a ON a.id = u.account_id
    ORDER BY u.created_at DESC
  `).all();

  const babies = db.prepare(`SELECT id, account_id, data FROM babies`).all();
  const babyMap = new Map();
  for (const b of babies) {
    const data = JSON.parse(b.data);
    const list = babyMap.get(b.account_id) ?? [];
    list.push({ id: b.id, name: data.name ?? '(sin nombre)', birthDate: data.birthDate });
    babyMap.set(b.account_id, list);
  }

  const result = users.map(u => ({
    id: u.id,
    username: u.username,
    email: u.email ?? null,
    role: u.role ?? 'user',
    familyRole: u.family_role ?? 'editor',
    accountId: u.account_id,
    accountName: u.account_name ?? null,
    inviteCode: u.invite_code,
    createdAt: u.created_at,
    lastLoginAt: u.last_login_at,
    babies: babyMap.get(u.account_id) ?? [],
  }));

  res.json(result);
});

// ── Guías: gestión desde el panel ─────────────────────────────────────────────

// El editor produce HTML que se guarda y se sirve a todos los visitantes.
// Aunque solo escriban administradores, se filtra a una lista blanca para que
// una cuenta comprometida no pueda inyectar scripts en una página pública.
const OPCIONES_SANEADO = {
  allowedTags: [
    'h2', 'h3', 'p', 'br', 'hr', 'strong', 'em', 'u', 's', 'code',
    'ul', 'ol', 'li', 'blockquote', 'a',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    div: ['class'],
    th: ['colspan', 'rowspan'],
    td: ['colspan', 'rowspan'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedClasses: { div: ['tabla-scroll'] },
  transformTags: {
    // Los enlaces externos se abren fuera y sin filtrar referencia.
    a: (nombre, attribs) => {
      const href = attribs.href ?? '';
      const externo = /^https?:\/\//i.test(href) && !href.includes('lacty.es');
      return {
        tagName: 'a',
        attribs: externo ? { ...attribs, target: '_blank', rel: 'noopener noreferrer' } : attribs,
      };
    },
  },
};

const normalizarSlug = (s) =>
  String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80);

function validarArticulo(body) {
  const titulo      = String(body?.titulo ?? '').trim();
  const descripcion = String(body?.descripcion ?? '').trim();
  const resumen     = String(body?.resumen ?? '').trim();
  const contenido   = String(body?.contenido ?? '').trim();
  if (!titulo)      return { error: 'El título es obligatorio' };
  if (!descripcion) return { error: 'La descripción para Google es obligatoria' };
  if (!resumen)     return { error: 'El resumen es obligatorio' };
  if (!contenido)   return { error: 'El contenido no puede estar vacío' };
  const slug = normalizarSlug(body?.slug || titulo);
  if (!slug) return { error: 'No se ha podido generar la URL a partir del título' };
  return {
    datos: {
      titulo, descripcion, resumen, slug,
      emoji: String(body?.emoji ?? '').trim() || null,
      contenido: sanitizeHtml(contenido, OPCIONES_SANEADO),
      publicado: body?.publicado ? 1 : 0,
    },
  };
}

app.get('/api/admin/articulos', requireAdmin, (_req, res) => {
  res.json(db.prepare(`SELECT * FROM articulos ORDER BY COALESCE(fecha_publicacion, creado_at) DESC`).all());
});

app.post('/api/admin/articulos', requireAdmin, (req, res) => {
  const { error, datos } = validarArticulo(req.body);
  if (error) return res.status(400).json({ error });
  if (db.prepare(`SELECT 1 FROM articulos WHERE slug = ?`).get(datos.slug)) {
    return res.status(409).json({ error: 'Ya existe una guía con esa URL' });
  }
  const id = newId();
  db.prepare(`
    INSERT INTO articulos (id, slug, titulo, descripcion, resumen, emoji, contenido, publicado, fecha_publicacion)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, datos.slug, datos.titulo, datos.descripcion, datos.resumen, datos.emoji,
         datos.contenido, datos.publicado, datos.publicado ? new Date().toISOString().slice(0, 10) : null);
  escribirSitemap();
  res.status(201).json(db.prepare(`SELECT * FROM articulos WHERE id = ?`).get(id));
});

app.put('/api/admin/articulos/:id', requireAdmin, (req, res) => {
  const actual = db.prepare(`SELECT * FROM articulos WHERE id = ?`).get(req.params.id);
  if (!actual) return res.status(404).json({ error: 'Guía no encontrada' });
  const { error, datos } = validarArticulo(req.body);
  if (error) return res.status(400).json({ error });
  const dup = db.prepare(`SELECT 1 FROM articulos WHERE slug = ? AND id != ?`).get(datos.slug, req.params.id);
  if (dup) return res.status(409).json({ error: 'Ya existe otra guía con esa URL' });

  // La fecha de publicación se fija la primera vez que se publica y ya no se
  // mueve: es la que ve Google como datePublished.
  const fechaPub = actual.fecha_publicacion
    ?? (datos.publicado ? new Date().toISOString().slice(0, 10) : null);

  db.prepare(`
    UPDATE articulos
       SET slug = ?, titulo = ?, descripcion = ?, resumen = ?, emoji = ?, contenido = ?,
           publicado = ?, fecha_publicacion = ?, actualizado_at = datetime('now')
     WHERE id = ?
  `).run(datos.slug, datos.titulo, datos.descripcion, datos.resumen, datos.emoji,
         datos.contenido, datos.publicado, fechaPub, req.params.id);
  escribirSitemap();
  res.json(db.prepare(`SELECT * FROM articulos WHERE id = ?`).get(req.params.id));
});

app.delete('/api/admin/articulos/:id', requireAdmin, (req, res) => {
  const r = db.prepare(`DELETE FROM articulos WHERE id = ?`).run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Guía no encontrada' });
  escribirSitemap();
  res.json({ ok: true });
});

app.put('/api/admin/users/:id/role', requireAdmin, (req, res) => {
  const { role } = req.body ?? {};
  if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: 'Rol no válido' });
  db.prepare(`UPDATE users SET role = ? WHERE id = ?`).run(role, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  if (req.params.id === req.session.userId) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
  const user = db.prepare(`SELECT account_id FROM users WHERE id = ?`).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  db.prepare(`DELETE FROM users WHERE id = ?`).run(req.params.id);
  // Si era el último usuario de la cuenta, eliminar la cuenta y sus datos
  const remaining = db.prepare(`SELECT COUNT(*) AS c FROM users WHERE account_id = ?`).get(user.account_id);
  if (remaining.c === 0) {
    for (const t of DATA_TABLES) db.prepare(`DELETE FROM ${t} WHERE baby_id IN (SELECT id FROM babies WHERE account_id = ?)`).run(user.account_id);
    db.prepare(`DELETE FROM babies WHERE account_id = ?`).run(user.account_id);
    db.prepare(`DELETE FROM push_subscriptions WHERE account_id = ?`).run(user.account_id);
    db.prepare(`DELETE FROM notification_prefs WHERE account_id = ?`).run(user.account_id);
    db.prepare(`DELETE FROM accounts WHERE id = ?`).run(user.account_id);
  }
  res.json({ ok: true });
});

app.post('/api/admin/users', requireAdmin, async (req, res) => {
  const { username, email, password, accountId } = req.body ?? {};
  if (!username || !email || !password) return res.status(400).json({ error: 'Faltan campos' });
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) return res.status(400).json({ error: 'Email no válido' });
  if (String(password).length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  const exists = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
  if (exists) return res.status(409).json({ error: 'Ese usuario ya existe' });
  const emailExists = db.prepare('SELECT 1 FROM users WHERE email = ?').get(normalizedEmail);
  if (emailExists) return res.status(409).json({ error: 'Ese email ya está registrado' });

  const userId = newId();
  const hash = bcrypt.hashSync(String(password), 12);

  if (accountId) {
    const acc = db.prepare(`SELECT id FROM accounts WHERE id = ?`).get(accountId);
    if (!acc) return res.status(404).json({ error: 'Familia no encontrada' });
    db.prepare(`INSERT INTO users (id, account_id, username, email, password_hash) VALUES (?, ?, ?, ?, ?)`)
      .run(userId, accountId, username, normalizedEmail, hash);
    res.status(201).json({ ok: true, id: userId, accountId });
  } else {
    const newAccountId = newId();
    const babyId = newId();
    db.transaction(() => {
      db.prepare(`INSERT INTO accounts (id, invite_code) VALUES (?, ?)`).run(newAccountId, newInvite());
      db.prepare(`INSERT INTO users (id, account_id, username, email, password_hash) VALUES (?, ?, ?, ?, ?)`)
        .run(userId, newAccountId, username, normalizedEmail, hash);
      const babyData = { id: babyId, daysOfLifeAtSetup: 1, setupDate: new Date().toISOString().slice(0, 10) };
      db.prepare(`INSERT INTO babies (id, account_id, data) VALUES (?, ?, ?)`)
        .run(babyId, newAccountId, JSON.stringify(babyData));
    })();
    res.status(201).json({ ok: true, id: userId, accountId: newAccountId });
  }
});

app.put('/api/admin/users/:id', requireAdmin, (req, res) => {
  const { username, email } = req.body ?? {};
  if (!username || !email) return res.status(400).json({ error: 'Faltan campos' });
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) return res.status(400).json({ error: 'Email no válido' });
  const dupUsername = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.params.id);
  if (dupUsername) return res.status(409).json({ error: 'Ese usuario ya existe' });
  const dupEmail = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(normalizedEmail, req.params.id);
  if (dupEmail) return res.status(409).json({ error: 'Ese email ya está registrado' });
  const updated = db.prepare(`UPDATE users SET username = ?, email = ? WHERE id = ?`).run(username, normalizedEmail, req.params.id);
  if (updated.changes === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ ok: true });
});

app.put('/api/admin/users/:id/password', requireAdmin, async (req, res) => {
  const { password } = req.body ?? {};
  if (!password) return res.status(400).json({ error: 'Falta la contraseña' });
  if (String(password).length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  const hash = bcrypt.hashSync(String(password), 12);
  const updated = db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hash, req.params.id);
  if (updated.changes === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ ok: true });
});

app.put('/api/admin/users/:id/family-role', requireAdmin, (req, res) => {
  const { familyRole } = req.body ?? {};
  if (!['owner', 'editor', 'viewer'].includes(familyRole)) return res.status(400).json({ error: 'Rol no válido' });
  const updated = db.prepare(`UPDATE users SET family_role = ? WHERE id = ?`).run(familyRole, req.params.id);
  if (updated.changes === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ ok: true });
});

app.put('/api/admin/users/:id/account', requireAdmin, (req, res) => {
  const { accountId } = req.body ?? {};
  if (!accountId) return res.status(400).json({ error: 'Falta el ID de familia' });
  const acc = db.prepare(`SELECT id FROM accounts WHERE id = ?`).get(accountId);
  if (!acc) return res.status(404).json({ error: 'Familia no encontrada' });
  const user = db.prepare(`SELECT account_id FROM users WHERE id = ?`).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (user.account_id === accountId) return res.status(400).json({ error: 'El usuario ya pertenece a esa familia' });
  const oldAccountId = user.account_id;
  db.prepare(`UPDATE users SET account_id = ? WHERE id = ?`).run(accountId, req.params.id);
  const remaining = db.prepare(`SELECT COUNT(*) AS c FROM users WHERE account_id = ?`).get(oldAccountId);
  if (remaining.c === 0) {
    for (const t of DATA_TABLES) db.prepare(`DELETE FROM ${t} WHERE baby_id IN (SELECT id FROM babies WHERE account_id = ?)`).run(oldAccountId);
    db.prepare(`DELETE FROM babies WHERE account_id = ?`).run(oldAccountId);
    db.prepare(`DELETE FROM push_subscriptions WHERE account_id = ?`).run(oldAccountId);
    db.prepare(`DELETE FROM notification_prefs WHERE account_id = ?`).run(oldAccountId);
    db.prepare(`DELETE FROM accounts WHERE id = ?`).run(oldAccountId);
  }
  res.json({ ok: true });
});

app.put('/api/admin/accounts/:accountId/invite-code', requireAdmin, (req, res) => {
  const code = newInvite();
  const updated = db.prepare(`UPDATE accounts SET invite_code = ? WHERE id = ?`).run(code, req.params.accountId);
  if (updated.changes === 0) return res.status(404).json({ error: 'Familia no encontrada' });
  res.json({ ok: true, inviteCode: code });
});

app.post('/api/admin/users/:id/impersonate', requireAdmin, (req, res) => {
  const target = db.prepare(`SELECT id, username, account_id, role, family_role FROM users WHERE id = ?`).get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (target.role === 'admin') return res.status(403).json({ error: 'No puedes impersonar a otro administrador' });
  req.session.originalUserId = req.session.userId;
  req.session.originalUsername = req.session.username;
  req.session.originalAccountId = req.session.accountId;
  req.session.userId = target.id;
  req.session.username = target.username;
  req.session.accountId = target.account_id;
  req.session.role = target.role ?? 'user';
  req.session.familyRole = target.family_role ?? 'editor';
  res.json({ ok: true, username: target.username });
});

app.post('/api/admin/impersonate/exit', (req, res) => {
  if (!req.session?.originalUserId) return res.status(400).json({ error: 'No estás en modo impersonación' });
  req.session.userId = req.session.originalUserId;
  req.session.username = req.session.originalUsername;
  req.session.accountId = req.session.originalAccountId;
  req.session.role = 'admin';
  req.session.familyRole = 'owner';
  delete req.session.originalUserId;
  delete req.session.originalUsername;
  delete req.session.originalAccountId;
  res.json({ ok: true });
});

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const d7 = new Date(now.getTime() - 7 * 86400000).toISOString();
  const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();

  const totalUsers = db.prepare(`SELECT COUNT(*) AS n FROM users`).get().n;
  const totalFamilies = db.prepare(`SELECT COUNT(*) AS n FROM accounts`).get().n;
  const totalBabies = db.prepare(`SELECT COUNT(*) AS n FROM babies`).get().n;

  const activeToday = db.prepare(`SELECT COUNT(*) AS n FROM users WHERE last_login_at >= ?`).get(today).n;
  const active7d = db.prepare(`SELECT COUNT(*) AS n FROM users WHERE last_login_at >= ?`).get(d7).n;
  const active30d = db.prepare(`SELECT COUNT(*) AS n FROM users WHERE last_login_at >= ?`).get(d30).n;
  const newUsers7d = db.prepare(`SELECT COUNT(*) AS n FROM users WHERE created_at >= ?`).get(d7).n;

  const feedingsToday = db.prepare(`SELECT COUNT(*) AS n FROM feedings WHERE json_extract(data, '$.timestamp') >= ?`).get(today).n;
  const feedings7d = db.prepare(`SELECT COUNT(*) AS n FROM feedings WHERE json_extract(data, '$.timestamp') >= ?`).get(d7).n;

  const inactiveFamiliesCount = db.prepare(`
    SELECT COUNT(DISTINCT a.id) AS n FROM accounts a
    WHERE NOT EXISTS (
      SELECT 1 FROM users u WHERE u.account_id = a.id AND u.last_login_at >= ?
    )
  `).get(d30).n;

  const recentLogins = db.prepare(`
    SELECT username, last_login_at FROM users
    WHERE last_login_at IS NOT NULL
    ORDER BY last_login_at DESC
    LIMIT 10
  `).all();

  const families = db.prepare(`
    SELECT a.id, a.name, a.invite_code,
           COUNT(DISTINCT ps.endpoint) AS subscriber_count
    FROM accounts a
    LEFT JOIN push_subscriptions ps ON ps.account_id = a.id
    GROUP BY a.id
    ORDER BY a.created_at
  `).all().map(r => ({ id: r.id, name: r.name ?? null, inviteCode: r.invite_code, subscriberCount: r.subscriber_count }));

  const totalSubscribers = db.prepare(`SELECT COUNT(*) AS n FROM push_subscriptions`).get().n;

  res.json({
    totalUsers, totalFamilies, totalBabies,
    activeToday, active7d, active30d,
    newUsers7d,
    feedingsToday, feedings7d,
    inactiveFamiliesCount,
    recentLogins,
    families,
    totalSubscribers,
  });
});

app.post('/api/admin/push/broadcast', requireAdmin, async (req, res) => {
  const { title, body, url, accountId } = req.body ?? {};
  if (!title || !body) return res.status(400).json({ error: 'Faltan título y cuerpo' });

  const subs = accountId
    ? db.prepare(`SELECT endpoint, subscription_json FROM push_subscriptions WHERE account_id = ?`).all(accountId)
    : db.prepare(`SELECT endpoint, subscription_json FROM push_subscriptions`).all();

  if (subs.length === 0) return res.json({ ok: true, sent: 0, failed: 0 });

  const payload = JSON.stringify({ title, body, tag: 'broadcast', ...(url ? { url } : {}) });

  const results = await Promise.allSettled(
    subs.map(row =>
      webpush.sendNotification(JSON.parse(row.subscription_json), payload).catch(err => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).run(row.endpoint);
        }
        throw err;
      })
    )
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  res.json({ ok: true, sent, failed });
});

app.get('/api/admin/push/subscriptions', requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT ps.id, ps.account_id, ps.user_id, ps.user_agent, ps.endpoint, ps.created_at,
           a.name AS account_name, a.invite_code,
           u.username
    FROM push_subscriptions ps
    LEFT JOIN accounts a ON a.id = ps.account_id
    LEFT JOIN users u ON u.id = ps.user_id
    ORDER BY ps.created_at DESC
  `).all();
  res.json(rows.map(r => ({
    id: r.id,
    accountId: r.account_id,
    accountName: r.account_name ?? null,
    inviteCode: r.invite_code ?? null,
    username: r.username ?? null,
    userAgent: r.user_agent ?? null,
    endpoint: r.endpoint,
    createdAt: r.created_at,
  })));
});

app.delete('/api/admin/push/subscriptions/:id', requireAdmin, (req, res) => {
  const updated = db.prepare(`DELETE FROM push_subscriptions WHERE id = ?`).run(req.params.id);
  if (updated.changes === 0) return res.status(404).json({ error: 'Suscripción no encontrada' });
  res.json({ ok: true });
});

app.get('/api/admin/babies', requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT b.id, b.account_id, b.data, b.created_at,
           a.name AS account_name, a.invite_code
    FROM babies b
    LEFT JOIN accounts a ON a.id = b.account_id
    ORDER BY b.created_at DESC
  `).all();
  res.json(rows.map(r => {
    const d = JSON.parse(r.data);
    return {
      id: r.id,
      accountId: r.account_id,
      accountName: r.account_name ?? null,
      inviteCode: r.invite_code ?? null,
      name: d.name ?? null,
      birthDate: d.birthDate ?? null,
      sex: d.sex ?? null,
      setupDate: d.setupDate ?? null,
      daysOfLifeAtSetup: d.daysOfLifeAtSetup ?? 1,
    };
  }));
});

app.put('/api/admin/babies/:id', requireAdmin, (req, res) => {
  const row = db.prepare(`SELECT data FROM babies WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Bebé no encontrado' });
  const data = JSON.parse(row.data);
  const { name, birthDate, sex } = req.body ?? {};
  if (name !== undefined) { const v = String(name).trim(); data.name = v || undefined; }
  if (birthDate !== undefined) { data.birthDate = birthDate || undefined; }
  if (sex !== undefined) { data.sex = ['male', 'female'].includes(sex) ? sex : undefined; }
  db.prepare(`UPDATE babies SET data = ? WHERE id = ?`).run(JSON.stringify(data), req.params.id);
  res.json({ ok: true });
});

app.delete('/api/admin/babies/:id', requireAdmin, (req, res) => {
  const row = db.prepare(`SELECT id FROM babies WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Bebé no encontrado' });
  for (const t of DATA_TABLES) db.prepare(`DELETE FROM ${t} WHERE baby_id = ?`).run(req.params.id);
  db.prepare(`DELETE FROM babies WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
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
  const rows = db.prepare(`SELECT id, username, family_role FROM users WHERE account_id = ? ORDER BY created_at`).all(req.accountId);
  const adminId = rows[0]?.id;
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
      familyRole: m.id === adminId ? 'owner' : (m.family_role ?? 'editor'),
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

// Cambiar el family_role de un miembro (solo el owner)
app.put('/api/account/members/:userId/role', (req, res) => {
  const rows = db.prepare(`SELECT id FROM users WHERE account_id = ? ORDER BY created_at`).all(req.accountId);
  const adminId = rows[0]?.id;
  if (req.session.userId !== adminId) return res.status(403).json({ error: 'Solo el administrador de la familia puede cambiar roles' });
  if (req.params.userId === adminId) return res.status(400).json({ error: 'El propietario no puede cambiar su propio rol' });
  const { familyRole } = req.body ?? {};
  if (!['editor', 'viewer'].includes(familyRole)) return res.status(400).json({ error: 'Rol no válido' });
  db.prepare(`UPDATE users SET family_role = ? WHERE id = ? AND account_id = ?`).run(familyRole, req.params.userId, req.accountId);
  res.json({ ok: true });
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

// ── Push notifications ────────────────────────────────────────────────────────

app.get('/api/push/vapid-key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

function parseUserAgent(ua) {
  if (!ua) return null;
  let browser = 'Navegador';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/') && !ua.includes('Chromium')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
  let os = '';
  if (/iPhone|iPad/.test(ua)) os = 'iOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  return os ? `${browser} · ${os}` : browser;
}

app.post('/api/push/subscribe', (req, res) => {
  const sub = req.body;
  if (!sub?.endpoint) return res.status(400).json({ error: 'Suscripción inválida' });
  const ua = parseUserAgent(req.get('User-Agent'));
  db.prepare(`
    INSERT OR REPLACE INTO push_subscriptions (id, account_id, user_id, user_agent, endpoint, subscription_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(newId(), req.accountId, req.session.userId, ua, sub.endpoint, JSON.stringify(sub));
  res.json({ ok: true });
});

app.delete('/api/push/subscribe', (req, res) => {
  const { endpoint } = req.body ?? {};
  if (endpoint) {
    db.prepare(`DELETE FROM push_subscriptions WHERE account_id = ? AND endpoint = ?`)
      .run(req.accountId, endpoint);
  }
  res.json({ ok: true });
});

app.get('/api/push/prefs/:babyId', (req, res) => {
  const row = db.prepare(`SELECT * FROM notification_prefs WHERE account_id = ? AND baby_id = ?`)
    .get(req.accountId, req.params.babyId);
  res.json({
    feedingThresholdMins:  row ? row.feeding_threshold_mins  : null,
    restThresholdMins:     row ? row.rest_threshold_mins     : null,
    massageThresholdMins:  row ? row.massage_threshold_mins  : null,
  });
});

app.put('/api/push/prefs/:babyId', (req, res) => {
  const { feedingThresholdMins, restThresholdMins, massageThresholdMins } = req.body ?? {};
  db.prepare(`
    INSERT INTO notification_prefs (account_id, baby_id, feeding_threshold_mins, rest_threshold_mins, massage_threshold_mins)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(account_id, baby_id) DO UPDATE SET
      feeding_threshold_mins  = excluded.feeding_threshold_mins,
      rest_threshold_mins     = excluded.rest_threshold_mins,
      massage_threshold_mins  = excluded.massage_threshold_mins
  `).run(req.accountId, req.params.babyId, feedingThresholdMins ?? 180, restThresholdMins ?? 120, massageThresholdMins ?? 15);
  res.json({ ok: true });
});

app.post('/api/push/test', async (req, res) => {
  try {
    const subs = db.prepare(`SELECT endpoint, subscription_json FROM push_subscriptions WHERE account_id = ?`).all(req.accountId);
    console.log('[push test] suscripciones encontradas:', subs.length);
    if (subs.length === 0) {
      return res.json({ ok: false, error: 'No hay dispositivos suscritos registrados en el servidor' });
    }
    const payload = JSON.stringify({
      title: 'Lacty — notificación de prueba',
      body: 'Las notificaciones están funcionando correctamente.',
      tag: 'test',
    });
    const results = await Promise.allSettled(
      subs.map((row) =>
        webpush.sendNotification(JSON.parse(row.subscription_json), payload).then((r) => {
          console.log('[push test] OK — status:', r.statusCode);
        }).catch((err) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).run(row.endpoint);
          }
          console.error('[push test] Error:', err.statusCode, err.body ?? err.message);
          throw new Error(`HTTP ${err.statusCode}: ${err.body ?? err.message}`);
        })
      )
    );
    const failed = results.filter((r) => r.status === 'rejected');
    const sent   = results.length - failed.length;
    if (sent === 0) {
      return res.json({ ok: false, error: failed[0]?.reason?.message ?? 'Error desconocido' });
    }
    res.json({ ok: true, sent, failed: failed.length });
  } catch (err) {
    console.error('[push test] Excepción inesperada:', err.message);
    res.status(500).json({ ok: false, error: `Error interno: ${err.message}` });
  }
});

// ── Notif scheduler ──────────────────────────────────────────────────────────

// Referencia orientativa por edad (días de vida) para umbrales por defecto.
// Espeja los datos de src/data/referenceTable.ts; actualizar en paralelo si cambian.
const NOTIF_REFERENCE = [
  { dayTo: 28, feedsPerDayMin: 8, awakeWindowMaxMin: 60  },
  { dayTo: 60, feedsPerDayMin: 7, awakeWindowMaxMin: 90  },
  { dayTo: 90, feedsPerDayMin: 6, awakeWindowMaxMin: 120 },
];

function getDefaultNotifPrefs(daysOfLife) {
  const row = NOTIF_REFERENCE.find((r) => daysOfLife <= r.dayTo);
  const feedsMin = row?.feedsPerDayMin ?? 6;
  return {
    feedingThresholdMins: Math.round(24 * 60 / feedsMin),
    restThresholdMins:    row?.awakeWindowMaxMin ?? 180,
  };
}

function getDaysOfLife(baby) {
  const today = new Date();
  const todayTs = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  if (baby.birthDate) {
    const b = new Date(baby.birthDate + 'T00:00:00');
    const bTs = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.floor((todayTs - bTs) / 86400000) + 1;
  }
  const setup = new Date(baby.setupDate);
  const sTs = Date.UTC(setup.getFullYear(), setup.getMonth(), setup.getDate());
  return baby.daysOfLifeAtSetup + Math.floor((todayTs - sTs) / 86400000);
}

// Espeja getRecommendedTimes de DailySummary.tsx — devuelve minutos desde medianoche.
const MASAJES_POR_DIA_POR_DEFECTO = 5;
const DIAS_DE_MASAJES_POR_DEFECTO = 21;

function getRecommendedMassageTimes(startTime, endTime, count) {
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const start = toMin(startTime);
  if (count <= 1) return [start];
  const interval = (toMin(endTime) - start) / (count - 1);
  return Array.from({ length: count }, (_, i) => Math.round(start + interval * i));
}

// Último día de masajes: el configurado o, si no, 21 días tras la intervención.
function frenectomyEndDate(baby) {
  if (baby.frenectomyEndDate) return baby.frenectomyEndDate;
  if (!baby.frenectomyDate) return null;
  const d = new Date(baby.frenectomyDate + 'T12:00:00');
  d.setDate(d.getDate() + DIAS_DE_MASAJES_POR_DEFECTO);
  return d.toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────

function sendPushToAccount(accountId, payload) {
  const subs = db.prepare(`SELECT endpoint, subscription_json FROM push_subscriptions WHERE account_id = ?`).all(accountId);
  for (const row of subs) {
    webpush.sendNotification(JSON.parse(row.subscription_json), JSON.stringify(payload)).catch((err) => {
      if (err.statusCode === 410 || err.statusCode === 404) {
        db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).run(row.endpoint);
      } else {
        console.error('[push] Error enviando notificación:', err.statusCode, err.body ?? err.message);
      }
    });
  }
}

/** Fecha «YYYY-MM-DD» en la zona del servidor, no en UTC (ver TZ del compose). */
function fechaLocal(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function checkNotifications() {
  const accounts = db.prepare(`SELECT DISTINCT account_id FROM push_subscriptions`).all();
  const now = Date.now();

  for (const { account_id } of accounts) {
    const babies = db.prepare(`SELECT id, data FROM babies WHERE account_id = ?`).all(account_id);

    for (const babyRow of babies) {
      const baby = JSON.parse(babyRow.data);
      const babyId = babyRow.id;
      const prefs = db.prepare(`SELECT * FROM notification_prefs WHERE account_id = ? AND baby_id = ?`)
        .get(account_id, babyId);
      const defaults = getDefaultNotifPrefs(getDaysOfLife(baby));
      const feedingMs = (prefs?.feeding_threshold_mins ?? defaults.feedingThresholdMins) * 60 * 1000;
      const restMs    = (prefs?.rest_threshold_mins    ?? defaults.restThresholdMins)    * 60 * 1000;
      const name = baby.name || 'el bebé';

      // Formatea una duración en ms como "2h 5min", "45min", "1h"
      function duracion(ms) {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        if (h === 0) return `${m} min`;
        if (m === 0) return `${h}h`;
        return `${h}h ${m} min`;
      }

      // Tomas
      const lastFeedingRow = db.prepare(
        `SELECT data FROM feedings WHERE baby_id = ? ORDER BY json_extract(data, '$.timestamp') DESC LIMIT 1`
      ).get(babyId);
      if (lastFeedingRow) {
        const lastTime  = new Date(JSON.parse(lastFeedingRow.data).timestamp).getTime();
        const lastNotif = prefs?.last_feeding_notif_at ? new Date(prefs.last_feeding_notif_at).getTime() : 0;
        if (now - lastTime > feedingMs && now - lastNotif > feedingMs) {
          sendPushToAccount(account_id, {
            title: `${name} tiene que comer`,
            body: `Lleva ${duracion(now - lastTime)} sin tomar`,
            tag: `feeding-${babyId}`,
          });
          db.prepare(`UPDATE notification_prefs SET last_feeding_notif_at = ? WHERE account_id = ? AND baby_id = ?`)
            .run(new Date().toISOString(), account_id, babyId);
        }
      }

      // Descanso (bebé lleva demasiado tiempo despierto)
      const lastRestRow = db.prepare(
        `SELECT data FROM rests WHERE baby_id = ? ORDER BY json_extract(data, '$.startTime') DESC LIMIT 1`
      ).get(babyId);
      if (lastRestRow) {
        const rest = JSON.parse(lastRestRow.data);
        if (rest.endTime) {
          const awakeMs   = now - new Date(rest.endTime).getTime();
          const lastNotif = prefs?.last_rest_notif_at ? new Date(prefs.last_rest_notif_at).getTime() : 0;
          if (awakeMs > restMs && now - lastNotif > restMs) {
            sendPushToAccount(account_id, {
              title: `${name} necesita dormir`,
              body: `Lleva ${duracion(awakeMs)} despierto/a`,
              tag: `rest-${babyId}`,
            });
            db.prepare(`UPDATE notification_prefs SET last_rest_notif_at = ? WHERE account_id = ? AND baby_id = ?`)
              .run(new Date().toISOString(), account_id, babyId);
          }
        }
      }

      // Masajes frenectomía
      if (baby.frenectomyEnabled && baby.frenectomyDate) {
        const today   = fechaLocal();
        const frenEnd = frenectomyEndDate(baby);
        if (frenEnd && today <= frenEnd) {
          const objetivo = baby.frenectomyMassagesPerDay > 0
            ? baby.frenectomyMassagesPerDay
            : MASAJES_POR_DIA_POR_DEFECTO;
          const slots    = getRecommendedMassageTimes(baby.frenectomyStartTime ?? '08:30', baby.frenectomyEndTime ?? '22:30', objetivo);
          const nowMin   = new Date().getHours() * 60 + new Date().getMinutes();
          const thresholdMins = prefs?.massage_threshold_mins ?? 15;
          const doneCount = db.prepare(
            `SELECT COUNT(*) AS n FROM massages WHERE baby_id = ? AND json_extract(data, '$.date') = ?`
          ).get(babyId, today).n;

          if (doneCount < objetivo) {
            let overdueSlot = -1;
            for (let i = doneCount; i < objetivo; i++) {
              if (nowMin >= slots[i] + thresholdMins) overdueSlot = i;
              else break;
            }
            if (overdueSlot >= 0) {
              const slotIntervalMins = objetivo > 1
                ? (slots[objetivo - 1] - slots[0]) / (objetivo - 1)
                : 240;
              const lastNotif      = prefs?.last_massage_notif_at;
              const lastNotifDate  = lastNotif ? new Date(lastNotif).toISOString().slice(0, 10) : '';
              const lastNotifMin   = lastNotif ? new Date(lastNotif).getHours() * 60 + new Date(lastNotif).getMinutes() : -9999;
              const minsSinceNotif = lastNotifDate === today ? nowMin - lastNotifMin : 9999;

              if (minsSinceNotif >= slotIntervalMins / 2) {
                const slotMin = slots[overdueSlot];
                const slotStr = `${String(Math.floor(slotMin / 60)).padStart(2, '0')}:${String(slotMin % 60).padStart(2, '0')}`;
                sendPushToAccount(account_id, {
                  title: `${name} necesita el masaje`,
                  body: `Masaje ${overdueSlot + 1} de ${objetivo} — previsto a las ${slotStr}`,
                  tag: `massage-${babyId}`,
                });
                db.prepare(`UPDATE notification_prefs SET last_massage_notif_at = ? WHERE account_id = ? AND baby_id = ?`)
                  .run(new Date().toISOString(), account_id, babyId);
              }
            }
          }
        }
      }

      const hoy       = fechaLocal();
      const ahoraMin  = new Date().getHours() * 60 + new Date().getMinutes();

      // Vitamina D y probiótico: un único aviso al día, cuando pasa la hora
      // configurada y todavía no se ha registrado la toma.
      const diarios = [
        { clave: 'vitd', tabla: 'vitamind',   activo: baby.vitaminDEnabled,  hora: baby.vitaminDReminderHour,  etiqueta: baby.vitaminDMedName  || 'la vitamina D' },
        { clave: 'prob', tabla: 'probiotics', activo: baby.probioticEnabled, hora: baby.probioticReminderHour, etiqueta: baby.probioticMedName || 'el probiótico' },
      ];
      for (const { clave, tabla, activo, hora, etiqueta } of diarios) {
        if (!activo || hora == null || ahoraMin < hora * 60) continue;
        const yaDado = db.prepare(`SELECT 1 FROM ${tabla} WHERE baby_id = ? AND json_extract(data, '$.date') = ?`)
          .get(babyId, hoy);
        if (yaDado) continue;
        const key = `${clave}:${babyId}`;
        const ultimo = ultimoAviso(key);
        if (ultimo && fechaLocal(new Date(ultimo)) === hoy) continue;
        sendPushToAccount(account_id, {
          title: `${name}: toca ${etiqueta}`,
          body: `Estaba previsto a las ${String(hora).padStart(2, '0')}:00 y aún no está apuntado`,
          tag: `${clave}-${babyId}`,
        });
        anotarAviso(key);
      }

      // Medicación programada: se avisa de la dosis pendiente cuando pasa su
      // hora con margen, y se insiste cada hora hasta que se registra.
      const MARGEN_MIN = 15;
      const INSISTE_MIN = 60;
      const planes = db.prepare(`SELECT data FROM medplans WHERE baby_id = ?`).all(babyId)
        .map((r) => JSON.parse(r.data));

      for (const plan of planes) {
        if (!plan?.times?.length) continue;
        if (plan.startDate > hoy || hoy > plan.endDate) continue;

        // Las dosis de hoy se cuentan por fecha local, no por la del ISO (UTC).
        const dadas = db.prepare(`SELECT data FROM medications WHERE baby_id = ? AND json_extract(data, '$.planId') = ?`)
          .all(babyId, plan.id)
          .filter((r) => fechaLocal(new Date(JSON.parse(r.data).timestamp)) === hoy)
          .length;

        const horas = [...plan.times].sort();
        if (dadas >= horas.length) continue;

        const prevista = horas[dadas];
        const previstaMin = Number(prevista.slice(0, 2)) * 60 + Number(prevista.slice(3, 5));
        if (ahoraMin < previstaMin + MARGEN_MIN) continue;

        const key = `medplan:${plan.id}`;
        const ultimo = ultimoAviso(key);
        if (ultimo && now - new Date(ultimo).getTime() < INSISTE_MIN * 60 * 1000) continue;

        const dosis = plan.doseMl != null ? ` · ${String(plan.doseMl).replace('.', ',')} ml` : '';
        sendPushToAccount(account_id, {
          title: `${name}: toca ${plan.name}`,
          body: horas.length > 1
            ? `Dosis ${dadas + 1} de ${horas.length}, prevista a las ${prevista}${dosis}`
            : `Estaba prevista a las ${prevista}${dosis}`,
          tag: `medplan-${plan.id}`,
        });
        anotarAviso(key);
      }
    }
  }
}

setInterval(checkNotifications, 60 * 1000);

// ── Static frontend (production build) ────────────────────────────────────────

// Dominios del sitio público. Todo lo demás (app.lacty.es, localhost, la IP
// del contenedor…) se considera la aplicación.
const DOMINIOS_PUBLICOS = new Set(['lacty.es', 'www.lacty.es']);
const esSitioPublico = (req) => DOMINIOS_PUBLICOS.has(req.hostname);

const DIST = join(__dirname, 'dist');
if (existsSync(DIST)) {
  app.use(express.static(DIST));
  // El servidor web manda aquí todo lo que no sea un fichero de la landing,
  // para no tener que enumerar cada página nueva en su configuración. Por eso
  // hay que distinguir: en el sitio público una ruta desconocida es un 404 de
  // verdad, mientras que en la app cualquier ruta la resuelve el enrutador
  // del navegador y debe devolver el HTML de la aplicación.
  app.get('/*path', (req, res) => {
    if (esSitioPublico(req)) return res.status(404).type('html').send(render404());
    res.sendFile(join(DIST, 'index.html'));
  });
}

escribirSitemap(); // al arrancar, para reflejar lo publicado tras el despliegue

app.listen(PORT, () =>
  console.log(`Lacty en http://localhost:${PORT}`)
);
