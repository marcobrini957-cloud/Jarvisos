module.exports = {
  apps: [
    {
      name:         'velquor-bridge',
      script:       'server.js',
      cwd:          '/opt/velquor-bridge',
      instances:    1,
      exec_mode:    'fork',
      watch:        false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        PORT:     '3001',
      },
      // Rotate logs daily, keep 7 days
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file:   '/var/log/velquor-bridge/error.log',
      out_file:     '/var/log/velquor-bridge/out.log',
      merge_logs:   true,
    },
  ],
};
