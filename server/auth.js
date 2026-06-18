import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { getDb } from './db.js';

const JWT_SECRET = 'rathole-dashboard-secret-change-me';
const JWT_EXPIRY = '24h';

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

export function revokeToken(token) {
  const db = getDb();
  const h = hashToken(token);
  db.prepare('INSERT OR IGNORE INTO revoked_tokens (token_hash) VALUES (?)').run(h);
}

function isTokenRevoked(token) {
  const db = getDb();
  const h = hashToken(token);
  const row = db.prepare('SELECT 1 FROM revoked_tokens WHERE token_hash = ?').get(h);
  return !!row;
}

let cleanupTimer = null;
function scheduleCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const db = getDb();
    db.prepare('DELETE FROM revoked_tokens WHERE revoked_at < datetime(\"now\", \"-25 hours\")').run();
  }, 60 * 60 * 1000);
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = header.slice(7);

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  if (isTokenRevoked(token)) {
    return res.status(401).json({ error: 'Token has been revoked' });
  }

  req.user = payload;
  scheduleCleanup();
  next();
}