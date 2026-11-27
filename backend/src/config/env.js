const path = require('path');
const dotenv = require('dotenv');

// Load backend/.env first, then fallback to root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  databaseUrl:
    process.env.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER || 'auction_user'}:${
      process.env.POSTGRES_PASSWORD || 'auction_pass'
    }@localhost:${process.env.POSTGRES_PORT || 5432}/${
      process.env.POSTGRES_DB || 'live_auction'
    }`,
  closingWorkerIntervalMs: Number(process.env.CLOSING_WORKER_INTERVAL_MS || 1000),
};

module.exports = config;
