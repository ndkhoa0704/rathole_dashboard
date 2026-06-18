import { Database } from 'bun:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data.db');

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    initTables();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      display_name TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS revoked_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT UNIQUE NOT NULL,
      revoked_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER DEFAULT 22,
      username TEXT DEFAULT 'root',
      password TEXT,
      private_key_path TEXT,
      description TEXT,
      status TEXT DEFAULT 'unknown',
      last_check TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tunnels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      client_server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      server_server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      local_port INTEGER NOT NULL,
      remote_port INTEGER NOT NULL,
      protocol TEXT DEFAULT 'tcp',
      enabled INTEGER DEFAULT 0,
      status TEXT DEFAULT 'stopped',
      last_action TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migration: add password column if upgrading from older schema
  try { db.exec('ALTER TABLE servers ADD COLUMN password TEXT'); } catch (e) { /* already exists */ }
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
