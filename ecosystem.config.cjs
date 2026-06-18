module.exports = {
  apps: [{
    name: 'rathole-dashboard',
    script: '/home/koanguyn/.bun/bin/bun',
    args: 'server/index.js',
    cwd: '/home/koanguyn/workspace/rathole_dashboard',
    env: {
      PORT: '8333',
      NODE_ENV: 'production',
    },
    autorestart: true,
    max_restarts: 5,
    restart_delay: 3000,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }],
};
