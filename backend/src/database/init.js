const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const config = require('../config/env');
const { pool } = require('../config/db');

async function ensureDatabaseExists() {
  const url = new URL(config.databaseUrl);
  const dbName = url.pathname.replace(/^\//, '');
  if (!dbName || !/^[a-zA-Z0-9_-]+$/.test(dbName)) {
    return;
  }

  try {
    await pool.query('SELECT 1');
    return;
  } catch (err) {
    // 3D000 = invalid_catalog_name (database does not exist yet)
    if (!err || err.code !== '3D000') {
      throw err;
    }
  }

  const adminUrl = new URL(config.databaseUrl);
  adminUrl.pathname = '/postgres';
  const adminClient = new Client({ connectionString: adminUrl.toString() });
  await adminClient.connect();
  try {
    const existsRes = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );
    if (existsRes.rows.length === 0) {
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`[DB Init] Created database "${dbName}".`);
    }
  } finally {
    await adminClient.end();
  }
}

async function initDatabase() {
  await ensureDatabaseExists();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
}

module.exports = { initDatabase, ensureDatabaseExists };
