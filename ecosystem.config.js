module.exports = {
  apps: [
    {
      name: "ghl-whatsapp",
      script: "server.js",
      args: "--port=3000",
      watch: false,
      env: {
        NODE_ENV: "production",
        // Enable knowledge-aware citations in replies
        REPLY_CITATIONS: "auto",
      },
      max_memory_restart: "300M",
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      autorestart: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      error_file: "logs/ghl-whatsapp-error.log",
      out_file: "logs/ghl-whatsapp-out.log",
      time: true,
    },
  ],
};