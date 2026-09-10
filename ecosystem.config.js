/**
 * PM2 Ecosystem Configuration for Antigravity AI Content Platform
 * Manages both the Next.js Web App and the BullMQ Background Worker service 24/7.
 * 
 * Usage on VPS:
 *   pm2 start ecosystem.config.js
 *   pm2 status
 *   pm2 logs
 *   pm2 save
 */

module.exports = {
  apps: [
    {
      name: "nextjs-web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1, // atau "max" untuk multi-core cluster
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
    {
      name: "bullmq-worker",
      script: "node_modules/tsx/dist/cli.mjs",
      args: "workers/index.ts",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "600M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
