module.exports = {
  apps: [
    {
      name: 'marketplace',
      cwd: __dirname,
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
      env: { NODE_ENV: 'production', PORT: 6735, HOST: '0.0.0.0' },
    },
  ],
};
