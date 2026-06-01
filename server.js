import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || join(__dirname, 'lacty.db');

const app = express();
app.use(cors());
app.use(express.json());

// ── Database setup ────────────────────────────────────────────────────────────

const db = new Database(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS config   (id TEXT PRIMARY KEY, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS feedings (id TEXT PRIMARY KEY, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS rests    (id TEXT PRIMARY KEY, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS weights  (id TEXT PRIMARY KEY, data TEXT NOT NULL);
`);

// Migrate from db.json on first run (INSERT OR IGNORE so it's idempotent)
const JSON_DB = join(__dirname, 'db.json');
if (existsSync(JSON_DB)) {
  try {
    const raw = JSON.parse(readFileSync(JSON_DB, 'utf-8'));
    const migrate = (table, rows = []) => {
      const stmt = db.prepare(`INSERT OR IGNORE INTO ${table} (id, data) VALUES (?, ?)`);
      for (const row of rows) if (row.id) stmt.run(String(row.id), JSON.stringify(row));
    };
    migrate('config',   raw.config);
    migrate('feedings', raw.feedings);
    migrate('rests',    raw.rests);
    migrate('weights',  raw.weights);
    console.log('✓ db.json migrado a SQLite');
  } catch (e) {
    console.warn('Migración db.json fallida:', e.message);
  }
}

// ── Generic CRUD ──────────────────────────────────────────────────────────────

function makeRouter(table) {
  const r = express.Router();

  r.get('/', (_, res) =>
    res.json(db.prepare(`SELECT data FROM ${table}`).all().map(row => JSON.parse(row.data)))
  );

  r.get('/:id', (req, res) => {
    const row = db.prepare(`SELECT data FROM ${table} WHERE id = ?`).get(req.params.id);
    row ? res.json(JSON.parse(row.data)) : res.status(404).json({ error: 'Not Found' });
  });

  r.post('/', (req, res) => {
    db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`).run(
      req.body.id, JSON.stringify(req.body)
    );
    res.status(201).json(req.body);
  });

  r.put('/:id', (req, res) => {
    const item = { ...req.body, id: req.params.id };
    db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`).run(
      item.id, JSON.stringify(item)
    );
    res.json(item);
  });

  r.delete('/:id', (req, res) => {
    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(req.params.id);
    res.status(200).json({});
  });

  return r;
}

// ── API routes ────────────────────────────────────────────────────────────────

app.use('/api/config',   makeRouter('config'));
app.use('/api/feedings', makeRouter('feedings'));
app.use('/api/rests',    makeRouter('rests'));
app.use('/api/weights',  makeRouter('weights'));

// ── Static frontend (production build) ────────────────────────────────────────

const DIST = join(__dirname, 'dist');
if (existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('/*path', (_, res) => res.sendFile(join(DIST, 'index.html')));
}

app.listen(PORT, () =>
  console.log(`Lacty en http://localhost:${PORT}`)
);
