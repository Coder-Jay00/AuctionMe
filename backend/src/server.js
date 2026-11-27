const http = require('http');
const config = require('./config/env');
const { pool } = require('./config/db');
const { initDatabase } = require('./database/init');
const { createApp } = require('./app');
const { setupSocketServer } = require('./sockets/auctionSocket');
const { startClosingWorker } = require('./workers/closingWorker');

async function startServer() {
  await initDatabase();

  let io = null;
  const app = createApp(() => io);
  const httpServer = http.createServer(app);
  io = setupSocketServer(httpServer, config.corsOrigin);

  const stopWorker = startClosingWorker(io, config.closingWorkerIntervalMs);

  httpServer.listen(config.port, () => {
    console.log(`[Server] Live Auction API + Socket.IO listening on http://localhost:${config.port}`);
    console.log(`[Server] CORS origin: ${config.corsOrigin}`);
    console.log(`[Server] Closing worker interval: ${config.closingWorkerIntervalMs}ms`);
  });

  const shutdown = async (signal) => {
    console.log(`\n[Server] Received ${signal}, shutting down gracefully...`);
    stopWorker();
    io.close();
    httpServer.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
