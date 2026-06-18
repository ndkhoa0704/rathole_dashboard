import { Router } from 'express';
import { getDb } from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const db = getDb();
  const tunnels = db.prepare(`
    SELECT t.*,
      cs.name as client_server_name, cs.host as client_server_host,
      ss.name as server_server_name, ss.host as server_server_host
    FROM tunnels t
    JOIN servers cs ON t.client_server_id = cs.id
    JOIN servers ss ON t.server_server_id = ss.id
    ORDER BY t.name
  `).all();
  res.json({ tunnels });
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const tunnel = db.prepare(`
    SELECT t.*,
      cs.name as client_server_name, cs.host as client_server_host,
      ss.name as server_server_name, ss.host as server_server_host
    FROM tunnels t
    JOIN servers cs ON t.client_server_id = cs.id
    JOIN servers ss ON t.server_server_id = ss.id
    WHERE t.id = ?
  `).get(req.params.id);
  if (!tunnel) return res.status(404).json({ error: 'Tunnel not found' });
  res.json({ tunnel });
});

router.post('/', (req, res) => {
  const { name, client_server_id, server_server_id, local_port, remote_port, protocol } = req.body;
  const errors = [];
  if (!name) errors.push('name is required');
  if (!client_server_id) errors.push('client_server_id is required');
  if (!server_server_id) errors.push('server_server_id is required');
  if (!local_port) errors.push('local_port is required');
  if (!remote_port) errors.push('remote_port is required');
  if (errors.length > 0) return res.status(400).json({ error: errors.join(', ') });
  if (client_server_id === server_server_id) return res.status(400).json({ error: 'Client and server must be different' });

  const db = getDb();
  if (!db.prepare('SELECT id FROM servers WHERE id = ?').get(client_server_id)) return res.status(400).json({ error: 'Client server not found' });
  if (!db.prepare('SELECT id FROM servers WHERE id = ?').get(server_server_id)) return res.status(400).json({ error: 'Target server not found' });

  const result = db.prepare(`
    INSERT INTO tunnels (name, client_server_id, server_server_id, local_port, remote_port, protocol)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, client_server_id, server_server_id, local_port, remote_port, protocol || 'tcp');

  const tunnel = db.prepare(`
    SELECT t.*, cs.name as client_server_name, ss.name as server_server_name
    FROM tunnels t JOIN servers cs ON t.client_server_id = cs.id JOIN servers ss ON t.server_server_id = ss.id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json({ tunnel });
});

router.put('/:id', (req, res) => {
  const { name, client_server_id, server_server_id, local_port, remote_port, protocol, enabled } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tunnels WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Tunnel not found' });

  db.prepare(`
    UPDATE tunnels SET name = ?, client_server_id = ?, server_server_id = ?,
    local_port = ?, remote_port = ?, protocol = ?, enabled = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name ?? existing.name, client_server_id ?? existing.client_server_id,
    server_server_id ?? existing.server_server_id,
    local_port ?? existing.local_port, remote_port ?? existing.remote_port,
    protocol ?? existing.protocol, enabled !== undefined ? enabled : existing.enabled,
    req.params.id
  );

  const tunnel = db.prepare(`
    SELECT t.*, cs.name as client_server_name, ss.name as server_server_name
    FROM tunnels t JOIN servers cs ON t.client_server_id = cs.id JOIN servers ss ON t.server_server_id = ss.id
    WHERE t.id = ?
  `).get(req.params.id);
  res.json({ tunnel });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  if (!db.prepare('SELECT id FROM tunnels WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Tunnel not found' });
  db.prepare('DELETE FROM tunnels WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/:id/start', async (req, res) => {
  const db = getDb();
  const row = db.prepare(`
    SELECT t.*,
      json_object('name',cs.name,'host',cs.host,'port',cs.port,'username',cs.username,'private_key_path',cs.private_key_path) as client_server,
      json_object('name',ss.name,'host',ss.host,'port',ss.port,'username',ss.username,'private_key_path',ss.private_key_path) as server_server
    FROM tunnels t JOIN servers cs ON t.client_server_id=cs.id JOIN servers ss ON t.server_server_id=ss.id
    WHERE t.id=?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Tunnel not found' });

  try {
    const { startTunnel } = await import('../tunnel-manager.js');
    const cs = JSON.parse(row.client_server);
    const ss = JSON.parse(row.server_server);
    await startTunnel(row, cs, ss);
    db.prepare("UPDATE tunnels SET enabled=1,status='running',last_action=datetime('now') WHERE id=?").run(req.params.id);
    res.json({ ok: true, status: 'running' });
  } catch (err) {
    db.prepare("UPDATE tunnels SET status='error',last_action=datetime('now') WHERE id=?").run(req.params.id);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/stop', async (req, res) => {
  const db = getDb();
  const row = db.prepare(`
    SELECT t.*,
      json_object('name',cs.name,'host',cs.host,'port',cs.port,'username',cs.username,'private_key_path',cs.private_key_path) as client_server,
      json_object('name',ss.name,'host',ss.host,'port',ss.port,'username',ss.username,'private_key_path',ss.private_key_path) as server_server
    FROM tunnels t JOIN servers cs ON t.client_server_id=cs.id JOIN servers ss ON t.server_server_id=ss.id
    WHERE t.id=?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Tunnel not found' });

  try {
    const { stopTunnel } = await import('../tunnel-manager.js');
    const cs = JSON.parse(row.client_server);
    const ss = JSON.parse(row.server_server);
    await stopTunnel(row, cs, ss);
    db.prepare("UPDATE tunnels SET enabled=0,status='stopped',last_action=datetime('now') WHERE id=?").run(req.params.id);
    res.json({ ok: true, status: 'stopped' });
  } catch (err) {
    db.prepare("UPDATE tunnels SET status='error',last_action=datetime('now') WHERE id=?").run(req.params.id);
    res.status(500).json({ error: err.message });
  }
});

export default router;
