#!/usr/bin/env node
import app from './server/index.js';

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`
╔═══════════════════════════════════════╗
║      FOUNDER OS Web Server            ║
║   Opportunity Intelligence Engine     ║
╚═══════════════════════════════════════╝

🚀 Server running at: http://localhost:${port}
🔐 Google OAuth enabled
📊 Research pipeline connected
💾 File-based persistence (.founder-os/)

Environment:
  NODE_ENV: ${process.env.NODE_ENV || 'development'}
  Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? '✓ Configured' : '✗ Not configured'}

Open your browser and go to http://localhost:${port}
  `);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});
