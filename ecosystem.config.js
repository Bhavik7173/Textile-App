// PM2 ecosystem config — manages the backend process on AWS EC2
// Run: pm2 start ecosystem.config.js --env production

module.exports = {
  apps: [
    {
      name:    'textile-backend',
      script:  './backend/server.js',
      cwd:     '/home/ubuntu/textile-billing',
      instances: 1,           // Increase to 'max' for multi-core
      exec_mode: 'fork',
      autorestart: true,
      watch:   false,
      max_memory_restart: '500M',

      env: {
        NODE_ENV: 'development',
        PORT:     5000,
      },

      env_production: {
        NODE_ENV: 'production',
        PORT:     5000,
        // All secrets come from EC2 environment variables or .env file
        // Set them with: pm2 set textile-backend:MONGO_URI "mongodb+srv://..."
      },

      error_file:  '/var/log/textile-billing/error.log',
      out_file:    '/var/log/textile-billing/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
