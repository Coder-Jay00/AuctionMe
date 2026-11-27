const { pool } = require('../src/config/db');
const { initDatabase } = require('../src/database/init');

async function main() {
  try {
    console.log('[DB Init] Applying schema...');
    await initDatabase();
    console.log('[DB Init] Schema applied successfully.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[DB Init] Failed:', err);
  process.exit(1);
});
