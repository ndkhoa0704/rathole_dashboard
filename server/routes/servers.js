import { Router } from 'express';
import { getDb } from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();
router.use(authMiddleware);

// GET /api/servers
router.get('/', (req, res) => {
  const db = getDb();
  const servers = db.prepare('SELECT * FROM servers ORDER BY name').all();
  res.json({ servers });
});

// GET /api/servers/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });
  res.json({ server });
});

// POST /api/servers
router.post('/', (req, res) => {
  const { name, host, port, username, password, private_key_path, description } = req.body;
  if (!name || !host) {
    return res.status(400).json({ error: 'Name and host are required' });
  }
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO servers (name, host, port, username, password, private_key_path, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, host, port || 22, username || 'root', password || null, private_key_path || null, description || null);
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ server });
});

// PUT /api/servers/:id
router.put('/:id', (req, res) => {
  const { name, host, port, username, password, private_key_path, description } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Server not found' });
  db.prepare(`
    UPDATE servers SET name = ?, host = ?, port = ?, username = ?,
    password = ?, private_key_path = ?, description = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name ?? existing.name, host ?? existing.host, port ?? existing.port,
    username ?? existing.username,
    password !== undefined ? password : existing.password,
    private_key_path !== undefined ? private_key_path : existing.private_key_path,
    description !== undefined ? description : existing.description,
    req.params.id
  );
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  res.json({ server });
});

// DELETE /api/servers/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Server not found' });
  db.prepare('DELETE FROM servers WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
