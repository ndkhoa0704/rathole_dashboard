import { Client } from 'ssh2';
import { readFileSync, existsSync } from 'fs';
import os from 'os';
import path from 'path';

// Expand ~ in path
function expandHome(p) {
  if (!p) return p;
  if (p.startsWith('~')) {
    return path.join(os.homedir(), p.slice(1));
  }
  return p;
}

// Create SSH connection
function sshConnect(server) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const keyPath = expandHome(server.private_key_path || '~/.ssh/id_rsa');

    const config = {
      host: server.host,
      port: server.port || 22,
      username: server.username || 'root',
      readyTimeout: 10000,
      tryKeyboard: true,      // allow keyboard-interactive auth
    };

    const methods = [];

    // 1. Password auth (explicit)
    if (server.password) {
      config.password = server.password;
      methods.push('password');
    }

    // 2. Private key auth
    if (keyPath && existsSync(keyPath)) {
      try {
        config.privateKey = readFileSync(keyPath);
        methods.push('key');
      } catch (e) {
        // key file unreadable, skip
      }
    }

    // 3. SSH agent auth (always try if agent socket is available)
    if (process.env.SSH_AUTH_SOCK) {
      config.agent = process.env.SSH_AUTH_SOCK;
      methods.push('agent');
    }

    // 4. Fallback: try default key locations
    if (methods.length === 0) {
      const defaults = ['id_rsa', 'id_ed25519', 'id_ecdsa'];
      for (const name of defaults) {
        const p = path.join(os.homedir(), '.ssh', name);
        if (existsSync(p)) {
          try {
            config.privateKey = readFileSync(p);
            methods.push('key(' + name + ')');
            break;
          } catch (e) { /* skip */ }
        }
      }
    }

    if (methods.length === 0) {
      reject(new Error(
        `SSH ${server.host}: No authentication method available. ` +
        'Provide a password or ensure an SSH key exists at ~/.ssh/id_rsa'
      ));
      return;
    }

    conn.on('ready', () => resolve(conn));
    conn.on('error', (err) => reject(new Error(`SSH ${server.host}: ${err.message}`)));

    conn.connect(config);
  });
}

// Execute a command via SSH and return stdout
function sshExec(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('data', (data) => { stdout += data.toString(); });
      stream.stderr.on('data', (data) => { stderr += data.toString(); });
      stream.on('close', (code) => {
        if (code !== 0) reject(new Error(`SSH command failed (exit ${code}): ${stderr || stdout}`));
        else resolve(stdout.trim());
      });
    });
  });
}

// Generate rathole client config
function generateClientConfig(tunnel, serverConfig) {
  const { local_port, remote_port, protocol, name } = tunnel;
  const serverHost = serverConfig.host;

  return `[client]
remote_addr = "${serverHost}:2333"

[client.services.${name}]
token = "rathole-dashboard-token"
local_addr = "127.0.0.1:${local_port}"
type = "${protocol}"

[client.transport]
type = "tcp"
`;
}

// Generate rathole server config
function generateServerConfig(tunnel, clientHost) {
  const { remote_port, name } = tunnel;

  return `[server]
bind_addr = "0.0.0.0:2333"
default_token = "rathole-dashboard-token"

[server.services.${name}]
token = "rathole-dashboard-token"
bind_addr = "0.0.0.0:${remote_port}"
type = "tcp"
`;
}

// Check if rathole is installed on remote server
async function checkRathole(conn) {
  try {
    await sshExec(conn, 'which rathole 2>/dev/null || echo "NOT_FOUND"');
    return true;
  } catch {
    return false;
  }
}

// Start a tunnel: configure rathole server and client on respective machines
export async function startTunnel(tunnel, clientServer, serverServer) {
  let serverConn, clientConn;

  try {
    // Connect to both servers
    serverConn = await sshConnect(serverServer);
    clientConn = await sshConnect(clientServer);

    // Check rathole exists on both
    const serverHasRathole = await checkRathole(serverConn);
    const clientHasRathole = await checkRathole(clientConn);

    if (!serverHasRathole) throw new Error(`rathole not installed on server ${serverServer.host}`);
    if (!clientHasRathole) throw new Error(`rathole not installed on client ${clientServer.host}`);

    // Kill any existing rathole processes on both
    await sshExec(serverConn, 'pkill rathole 2>/dev/null; sleep 1; echo ok').catch(() => {});
    await sshExec(clientConn, 'pkill rathole 2>/dev/null; sleep 1; echo ok').catch(() => {});

    // Generate configs
    const serverConfig = generateServerConfig(tunnel, clientServer.host);
    const clientConfig = generateClientConfig(tunnel, serverServer);

    // Write configs to remote servers
    const writeServerCmd = `mkdir -p /etc/rathole && cat > /etc/rathole/server.toml <<'RATHOLE_CFG_EOF'\n${serverConfig}RATHOLE_CFG_EOF`;
    const writeClientCmd = `mkdir -p /etc/rathole && cat > /etc/rathole/client.toml <<'RATHOLE_CFG_EOF'\n${clientConfig}RATHOLE_CFG_EOF`;

    await sshExec(serverConn, writeServerCmd);
    await sshExec(clientConn, writeClientCmd);

    // Start rathole server first (in background)
    await sshExec(serverConn, 'nohup rathole /etc/rathole/server.toml > /var/log/rathole-server.log 2>&1 & echo started');

    // Wait a moment for server to be ready
    await new Promise(r => setTimeout(r, 2000));

    // Start rathole client
    await sshExec(clientConn, 'nohup rathole /etc/rathole/client.toml > /var/log/rathole-client.log 2>&1 & echo started');

    return { ok: true };

  } catch (err) {
    throw err;
  } finally {
    if (serverConn) serverConn.end();
    if (clientConn) clientConn.end();
  }
}

// Stop a tunnel: kill rathole on both sides
export async function stopTunnel(tunnel, clientServer, serverServer) {
  let serverConn, clientConn;

  try {
    serverConn = await sshConnect(serverServer);
    clientConn = await sshConnect(clientServer);

    await sshExec(serverConn, 'pkill rathole 2>/dev/null; echo ok').catch(() => {});
    await sshExec(clientConn, 'pkill rathole 2>/dev/null; echo ok').catch(() => {});

    return { ok: true };

  } catch (err) {
    throw err;
  } finally {
    if (serverConn) serverConn.end();
    if (clientConn) clientConn.end();
  }
}
