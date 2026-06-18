import { Database } from 'bun:sqlite';
import bcrypt from 'bcryptjs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data.db');

const db = new Database(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');

// Ensure users table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    display_name TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(q) {
  return new Promise(resolve => rl.question(q, resolve));
}

async function main() {
  console.log('=== Rathole Dashboard - Create Account ===\n');

  const args = process.argv.slice(2);
  let username = null, password = null, displayName = null;

  if (args.length >= 2) {
    username = args[0];
    password = args[1];
    displayName = args[2] || args[0];
  } else {
    username = await ask('Username: ');
    password = await ask('Password: ');
    displayName = await ask('Display name (optional): ') || username;
  }

  if (!username || !password) {
    console.error('Username and password are required.');
    process.exit(1);
  }

  const existing = db.query('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    console.error(`User "${username}" already exists.`);
    db.close();
    process.exit(1);
  }

  const hash = bcrypt.hashSync(password, 10);
  db.run('INSERT INTO users (username, password, display_name) VALUES (?, ?, ?)', [username, hash, displayName]);

  console.log(`\nAccount created: ${username} (${displayName})`);
  db.close();
  rl.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
