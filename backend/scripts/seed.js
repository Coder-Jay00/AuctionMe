const crypto = require('crypto');
const { pool } = require('../src/config/db');
const { initDatabase } = require('../src/database/init');
const { hashPassword } = require('../src/services/authService');

const DEMO_AUCTION_ID = '11111111-1111-4111-8111-111111111111';

async function upsertUser({ auctionMeId, displayName, password, role }) {
  const passwordHash = hashPassword(password);
  const res = await pool.query(
    `INSERT INTO users (auction_me_id, display_name, password_hash, role, is_active)
     VALUES ($1, $2, $3, $4, TRUE)
     ON CONFLICT (auction_me_id) DO UPDATE
       SET display_name = EXCLUDED.display_name,
           role = EXCLUDED.role,
           is_active = TRUE,
           updated_at = NOW()
     RETURNING id, auction_me_id, display_name, role`,
    [auctionMeId, displayName, passwordHash, role]
  );
  return res.rows[0];
}

async function main() {
  try {
    await initDatabase();

    // Seed demo accounts for all 3 roles (passwords hashed via scrypt)
    const adminUser = await upsertUser({
      auctionMeId: 'admin-01',
      displayName: 'AuctionMe Admin',
      password: 'AdminPassword@123',
      role: 'ADMIN',
    });
    const hostUser = await upsertUser({
      auctionMeId: 'host-curate-01',
      displayName: 'Curated Horology House',
      password: 'HostPassword@123',
      role: 'HOST',
    });
    await upsertUser({
      auctionMeId: 'bidder-aarav-01',
      displayName: 'Aarav Mehta',
      password: 'BidderPassword@123',
      role: 'BIDDER',
    });
    await upsertUser({
      auctionMeId: 'bidder-meera-02',
      displayName: 'Meera Nair',
      password: 'BidderPassword@123',
      role: 'BIDDER',
    });

    // Reset the demo auction deterministically so re-seeding always gives a fresh live demo
    await pool.query('DELETE FROM auctions WHERE id = $1', [DEMO_AUCTION_ID]);

    const startingPrice = 2500000; // ₹25,000.00 in paise
    const initialBidPrice = 2650000; // ₹26,500.00 in paise
    const minIncrement = 50000; // ₹500.00 in paise

    const auctionRes = await pool.query(
      `INSERT INTO auctions (
         id, title, description, status,
         starting_price, current_price, min_increment,
         highest_bidder_id, winner_id,
         starts_at, ends_at, version,
         host_user_id, category, moderation_status
       )
       VALUES (
         $1,
         $2,
         $3,
         'LIVE',
         $4,
         $5,
         $6,
         'bidder-aarav-01',
         NULL,
         NOW() - INTERVAL '5 minutes',
         NOW() + INTERVAL '5 minutes',
         3,
         $7,
         'Watches',
         'APPROVED'
       )
       RETURNING *`,
      [
        DEMO_AUCTION_ID,
        '1969 Grand Seiko Hi-Beat 36000 — Collector Edition (Ref. 4520-8000)',
        'Authenticated vintage Japanese mechanical dress watch in 18k gold-cap stainless steel case, manual-wind Caliber 4520A movement beating at 36,000 vph, complete with original box, chronometer certificate, and Horological Society provenance.',
        startingPrice,
        initialBidPrice,
        minIncrement,
        hostUser.id,
      ]
    );

    // Seed two realistic initial bids
    await pool.query(
      `INSERT INTO bids (auction_id, bidder_id, amount, request_id, created_at)
       VALUES
         ($1, 'bidder-meera-02', $2, $3, NOW() - INTERVAL '3 minutes'),
         ($1, 'bidder-aarav-01', $4, $5, NOW() - INTERVAL '1 minute')`,
      [
        DEMO_AUCTION_ID,
        2550000,
        crypto.randomUUID(),
        initialBidPrice,
        crypto.randomUUID(),
      ]
    );

    const seeded = auctionRes.rows[0];
    console.log('[Seed] Demo users seeded: admin-01 (ADMIN), host-curate-01 (HOST), bidder-aarav-01 (BIDDER), bidder-meera-02 (BIDDER)');
    console.log('[Seed] Live demo auction seeded successfully:');
    console.log(`  ID:             ${seeded.id}`);
    console.log(`  Host:           ${hostUser.auction_me_id} (${adminUser.auction_me_id} admin ready)`);
    console.log(`  Title:          ${seeded.title}`);
    console.log(`  Current Price:  ₹${(Number(seeded.current_price) / 100).toLocaleString('en-IN')} (${seeded.current_price} paise)`);
    console.log(`  Min Increment:  ₹${(Number(seeded.min_increment) / 100).toLocaleString('en-IN')} (${seeded.min_increment} paise)`);
    console.log(`  Ends At:        ${new Date(seeded.ends_at).toISOString()}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[Seed] Failed:', err);
  process.exit(1);
});
