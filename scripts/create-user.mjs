import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const [,, username, password] = process.argv;

if (!username || !password) {
  console.error('Uso: node scripts/create-user.mjs <usuario> <contraseña>');
  process.exit(1);
}

const db = new Database(join(__dirname, '../lacty.db'));
db.exec(`CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
)`);

const passwordHash = bcrypt.hashSync(password, 12);
const id = randomBytes(8).toString('hex');

try {
  db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)').run(id, username, passwordHash);
  console.log(`✓ Usuario "${username}" creado correctamente`);
} catch (e) {
  if (e.message?.includes('UNIQUE')) {
    console.error(`El usuario "${username}" ya existe`);
  } else {
    throw e;
  }
} finally {
  db.close();
}
