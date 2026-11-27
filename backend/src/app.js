const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const { pool } = require('./config/db');
const { createAuctionRouter } = require('./routes/auctions');
const { createAuthRouter } = require('./routes/auth');
const { createHostRouter } = require('./routes/host');
const { createMeRouter } = require('./routes/me');
const { createAdminRouter } = require('./routes/admin');
const { attachUser } = require('./middleware/auth');
const { AppError } = require('./services/helpers');

function createApp(getIo = () => null) {
  const app = express();

  const allowedOrigins = config.corsOrigin.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(attachUser);

  app.get('/api/health', async (req, res) => {
    try {
      const dbRes = await pool.query('SELECT clock_timestamp() AS server_time');
      res.json({
        status: 'ok',
        serverTime: new Date(dbRes.rows[0].server_time).toISOString(),
      });
    } catch (err) {
      res.status(503).json({
        status: 'error',
        error: 'Database unavailable',
      });
    }
  });

  app.use('/api/auth', createAuthRouter());
  app.use('/api/me', createMeRouter());
  app.use('/api/host', createHostRouter(getIo));
  app.use('/api/admin', createAdminRouter());
  app.use('/api/auctions', createAuctionRouter(getIo));

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.originalUrl} not found.`,
      },
    });
  });

  // Centralized error handler
  app.use((err, req, res, next) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        accepted: false,
        error: {
          code: err.code,
          message: err.message,
          details: err.details || undefined,
        },
      });
    }

    if (err && err.type === 'entity.parse.failed') {
      return res.status(400).json({
        accepted: false,
        error: {
          code: 'INVALID_JSON',
          message: 'Request body must be valid JSON.',
        },
      });
    }

    console.error('[Express] Unhandled error:', err);
    return res.status(500).json({
      accepted: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected server error occurred.',
      },
    });
  });

  return app;
}

module.exports = { createApp };
