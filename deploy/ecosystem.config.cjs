module.exports = {
  apps: [{
    name: "parjai",
    cwd: "/var/www/parjai",
    script: "node_modules/.bin/next",
    args: "start",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
      AUTH_TRUST_HOST: "true",
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: "512M",
  }],
};
