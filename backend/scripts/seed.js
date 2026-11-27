const config = require('../src/config/env');
const { pool } = require('../src/config/db');
const { initDatabase } = require('../src/database/init');
const { hashPassword } = require('../src/services/authService');

// Fixed deterministic UUIDs for 100% idempotent seeding
const IDS = {
  auctions: {
    liveWatch: '11111111-1111-4111-8111-111111111101',
    liveCamera: '11111111-1111-4111-8111-111111111102',
    liveVinyl: '11111111-1111-4111-8111-111111111103',
    upcomingOmega: '11111111-1111-4111-8111-111111111104',
    upcomingArt: '11111111-1111-4111-8111-111111111105',
    closedRolex: '11111111-1111-4111-8111-111111111106',
    closedHasselblad: '11111111-1111-4111-8111-111111111107',
  },
  notifications: {
    bidAccepted: '22222222-2222-4222-8222-222222222201',
    outbid: '22222222-2222-4222-8222-222222222202',
    extended: '22222222-2222-4222-8222-222222222203',
    resultDeclared: '22222222-2222-4222-8222-222222222204',
  },
  complaints: {
    sample: '33333333-3333-4333-8333-333333333301',
  },
  auditLogs: {
    approvedLot: '44444444-4444-4444-8444-444444444401',
    reviewedAccount: '44444444-4444-4444-8444-444444444402',
  },
};

async function upsertUser({ auctionMeId, displayName, password, role }) {
  const passwordHash = hashPassword(password);
  const res = await pool.query(
    `INSERT INTO users (auction_me_id, display_name, password_hash, role, is_active)
     VALUES ($1, $2, $3, $4, TRUE)
     ON CONFLICT (auction_me_id) DO UPDATE
       SET display_name = EXCLUDED.display_name,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           is_active = TRUE,
           updated_at = NOW()
     RETURNING id, auction_me_id, display_name, role`,
    [auctionMeId, displayName, passwordHash, role]
  );
  return res.rows[0];
}

async function upsertAuction(a) {
  await pool.query(
    `INSERT INTO auctions (
       id, title, description, status,
       starting_price, current_price, min_increment,
       highest_bidder_id, winner_id,
       starts_at, ends_at, closed_at, version,
       host_user_id, category, moderation_status
     )
     VALUES (
       $1, $2, $3, $4,
       $5, $6, $7,
       $8, $9,
       NOW() + ($10 || ' minutes')::interval,
       NOW() + ($11 || ' minutes')::interval,
       CASE WHEN $12::text IS NULL THEN NULL ELSE NOW() + ($12 || ' minutes')::interval END,
       $13,
       $14, $15, 'APPROVED'
     )
     ON CONFLICT (id) DO UPDATE
       SET title = EXCLUDED.title,
           description = EXCLUDED.description,
           status = EXCLUDED.status,
           starting_price = EXCLUDED.starting_price,
           current_price = EXCLUDED.current_price,
           min_increment = EXCLUDED.min_increment,
           highest_bidder_id = EXCLUDED.highest_bidder_id,
           winner_id = EXCLUDED.winner_id,
           starts_at = EXCLUDED.starts_at,
           ends_at = EXCLUDED.ends_at,
           closed_at = EXCLUDED.closed_at,
           version = EXCLUDED.version,
           host_user_id = EXCLUDED.host_user_id,
           category = EXCLUDED.category,
           moderation_status = 'APPROVED',
           updated_at = NOW()`,
    [
      a.id,
      a.title,
      a.description,
      a.status,
      a.startingPrice,
      a.currentPrice,
      a.minIncrement,
      a.highestBidderId,
      a.winnerId,
      String(a.startsOffsetMin),
      String(a.endsOffsetMin),
      a.closedOffsetMin === null ? null : String(a.closedOffsetMin),
      a.version,
      a.hostUserId,
      a.category,
    ]
  );
}

async function upsertBid({ id, auctionId, bidderId, amount, requestId, createdOffsetMin }) {
  await pool.query(
    `INSERT INTO bids (id, auction_id, bidder_id, amount, request_id, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW() + ($6 || ' minutes')::interval)
     ON CONFLICT (auction_id, request_id) DO NOTHING`,
    [id, auctionId, bidderId, amount, requestId, String(createdOffsetMin)]
  );
}

async function main() {
  if (config.nodeEnv === 'production' && !process.env.DEMO_PASSWORD) {
    throw new Error(
      'Refusing to seed demo accounts in production without an explicit DEMO_PASSWORD.'
    );
  }

  const demoPassword = config.demoPassword;
  if (!demoPassword || demoPassword.length < 8) {
    throw new Error('DEMO_PASSWORD must be at least 8 characters long.');
  }

  try {
    await initDatabase();

    // Remove legacy single demo auction ID if present from earlier MVP seed
    await pool.query('DELETE FROM auctions WHERE id = $1', [
      '11111111-1111-4111-8111-111111111111',
    ]);

    // 1. Seed required 3 role demo accounts + 2 supporting competing bidders
    const demoBidder = await upsertUser({
      auctionMeId: 'demo_bidder',
      displayName: 'Demo Bidder',
      password: demoPassword,
      role: 'BIDDER',
    });
    const demoHost = await upsertUser({
      auctionMeId: 'demo_host',
      displayName: 'Demo Auction House',
      password: demoPassword,
      role: 'HOST',
    });
    const demoAdmin = await upsertUser({
      auctionMeId: 'demo_admin',
      displayName: 'Demo Administrator',
      password: demoPassword,
      role: 'ADMIN',
    });
    await upsertUser({
      auctionMeId: 'bidder_aarav',
      displayName: 'Aarav Mehta',
      password: demoPassword,
      role: 'BIDDER',
    });
    await upsertUser({
      auctionMeId: 'bidder_meera',
      displayName: 'Meera Nair',
      password: demoPassword,
      role: 'BIDDER',
    });

    // 2. Seed 7 realistic deterministic auctions across LIVE (3), SCHEDULED (2), CLOSED (2)
    const auctions = [
      {
        id: IDS.auctions.liveWatch,
        title: '1969 Grand Seiko Hi-Beat 36000 — Collector Edition (Ref. 4520-8000)',
        description:
          'Authenticated vintage Japanese mechanical dress watch in 18k gold-cap stainless steel case, manual-wind Caliber 4520A movement beating at 36,000 vph, complete with original box and provenance.',
        status: 'LIVE',
        startingPrice: 2500000, // ₹25,000
        currentPrice: 2650000,  // ₹26,500
        minIncrement: 50000,    // ₹500
        highestBidderId: 'demo_bidder',
        winnerId: null,
        startsOffsetMin: -20,
        endsOffsetMin: 25,
        closedOffsetMin: null,
        version: 4,
        hostUserId: demoHost.id,
        category: 'Watches',
      },
      {
        id: IDS.auctions.liveCamera,
        title: 'Leica M3 Double Stroke Rangefinder (1956) + Summicron 50mm f/2',
        description:
          'Early-production Wetzlar Leica M3 Double Stroke with rigid Summicron 50mm f/2 lens, recently CLA serviced with clean viewfinder and verified shutter timings.',
        status: 'LIVE',
        startingPrice: 12000000, // ₹1,20,000
        currentPrice: 13500000,  // ₹1,35,000
        minIncrement: 500000,    // ₹5,000
        highestBidderId: 'bidder_meera',
        winnerId: null,
        startsOffsetMin: -30,
        endsOffsetMin: 45,
        closedOffsetMin: null,
        version: 4,
        hostUserId: demoHost.id,
        category: 'Cameras',
      },
      {
        id: IDS.auctions.liveVinyl,
        title: 'First-Pressing Indian Classical Vinyl Archive Box Set (1972)',
        description:
          'Numbered 6-LP collector box set in near-mint archival condition with original liner notes and silk-bound sleeve.',
        status: 'LIVE',
        startingPrice: 1500000, // ₹15,000
        currentPrice: 1650000,  // ₹16,500
        minIncrement: 50000,    // ₹500
        highestBidderId: 'bidder_aarav',
        winnerId: null,
        startsOffsetMin: -15,
        endsOffsetMin: 60,
        closedOffsetMin: null,
        version: 3,
        hostUserId: demoHost.id,
        category: 'Collectibles',
      },
      {
        id: IDS.auctions.upcomingOmega,
        title: 'Omega Speedmaster Professional Moonwatch (Cal. 1861, Full Set)',
        description:
          'Hesalite crystal Speedmaster Professional complete with presentation box, NATO strap, loupe, and warranty cards.',
        status: 'SCHEDULED',
        startingPrice: 42000000, // ₹4,20,000
        currentPrice: 42000000,
        minIncrement: 1000000,   // ₹10,000
        highestBidderId: null,
        winnerId: null,
        startsOffsetMin: 120,
        endsOffsetMin: 300,
        closedOffsetMin: null,
        version: 1,
        hostUserId: demoHost.id,
        category: 'Watches',
      },
      {
        id: IDS.auctions.upcomingArt,
        title: 'Signed Archival Lithograph — Modernist Horses Series (Ed. 14/50)',
        description:
          'Museum-framed hand-numbered archival lithograph accompanied by gallery certificate of authenticity and provenance dossier.',
        status: 'SCHEDULED',
        startingPrice: 8500000, // ₹85,000
        currentPrice: 8500000,
        minIncrement: 250000,   // ₹2,500
        highestBidderId: null,
        winnerId: null,
        startsOffsetMin: 240,
        endsOffsetMin: 480,
        closedOffsetMin: null,
        version: 1,
        hostUserId: demoHost.id,
        category: 'Fine Art',
      },
      {
        id: IDS.auctions.closedRolex,
        title: 'Rolex Oyster Perpetual Datejust 1601 (1974, Silver Pie-Pan Dial)',
        description:
          'Classic 36mm steel and 18k white gold fluted bezel Datejust on Jubilee bracelet with verified serial and service papers.',
        status: 'CLOSED',
        startingPrice: 30000000, // ₹3,00,000
        currentPrice: 34000000,  // ₹3,40,000
        minIncrement: 1000000,   // ₹10,000
        highestBidderId: 'demo_bidder',
        winnerId: 'demo_bidder',
        startsOffsetMin: -180,
        endsOffsetMin: -60,
        closedOffsetMin: -60,
        version: 5,
        hostUserId: demoHost.id,
        category: 'Watches',
      },
      {
        id: IDS.auctions.closedHasselblad,
        title: 'Hasselblad 500C/M Medium Format Kit (Carl Zeiss Planar 80mm f/2.8)',
        description:
          'Complete waist-level finder medium format camera with A12 film back and Carl Zeiss T* 80mm lens.',
        status: 'CLOSED',
        startingPrice: 9000000,  // ₹90,000
        currentPrice: 10500000,  // ₹1,05,000
        minIncrement: 500000,    // ₹5,000
        highestBidderId: 'bidder_aarav',
        winnerId: 'bidder_aarav',
        startsOffsetMin: -240,
        endsOffsetMin: -90,
        closedOffsetMin: -90,
        version: 4,
        hostUserId: demoHost.id,
        category: 'Cameras',
      },
    ];

    for (const auction of auctions) {
      await upsertAuction(auction);
    }

    // 3. Seed strictly valid, monotonic bids matching each auction's final/current price
    const bids = [
      // Live Grand Seiko: 25,000 -> 25,500 -> 26,000 -> 26,500 (demo_bidder leads)
      {
        id: '55555555-5555-4555-8555-555555555501',
        auctionId: IDS.auctions.liveWatch,
        bidderId: 'bidder_meera',
        amount: 2550000,
        requestId: '66666666-6666-4666-8666-666666666601',
        createdOffsetMin: -15,
      },
      {
        id: '55555555-5555-4555-8555-555555555502',
        auctionId: IDS.auctions.liveWatch,
        bidderId: 'bidder_aarav',
        amount: 2600000,
        requestId: '66666666-6666-4666-8666-666666666602',
        createdOffsetMin: -10,
      },
      {
        id: '55555555-5555-4555-8555-555555555503',
        auctionId: IDS.auctions.liveWatch,
        bidderId: 'demo_bidder',
        amount: 2650000,
        requestId: '66666666-6666-4666-8666-666666666603',
        createdOffsetMin: -4,
      },
      // Live Leica M3: 1,20,000 -> 1,25,000 -> 1,30,000 (demo_bidder) -> 1,35,000 (bidder_meera outbids)
      {
        id: '55555555-5555-4555-8555-555555555504',
        auctionId: IDS.auctions.liveCamera,
        bidderId: 'bidder_aarav',
        amount: 12500000,
        requestId: '66666666-6666-4666-8666-666666666604',
        createdOffsetMin: -25,
      },
      {
        id: '55555555-5555-4555-8555-555555555505',
        auctionId: IDS.auctions.liveCamera,
        bidderId: 'demo_bidder',
        amount: 13000000,
        requestId: '66666666-6666-4666-8666-666666666605',
        createdOffsetMin: -14,
      },
      {
        id: '55555555-5555-4555-8555-555555555506',
        auctionId: IDS.auctions.liveCamera,
        bidderId: 'bidder_meera',
        amount: 13500000,
        requestId: '66666666-6666-4666-8666-666666666606',
        createdOffsetMin: -6,
      },
      // Live Vinyl: 15,000 -> 15,500 -> 16,500 (bidder_aarav leads)
      {
        id: '55555555-5555-4555-8555-555555555507',
        auctionId: IDS.auctions.liveVinyl,
        bidderId: 'bidder_meera',
        amount: 1550000,
        requestId: '66666666-6666-4666-8666-666666666607',
        createdOffsetMin: -12,
      },
      {
        id: '55555555-5555-4555-8555-555555555508',
        auctionId: IDS.auctions.liveVinyl,
        bidderId: 'bidder_aarav',
        amount: 1650000,
        requestId: '66666666-6666-4666-8666-666666666608',
        createdOffsetMin: -5,
      },
      // Closed Rolex Datejust: 3,00,000 -> 3,10,000 -> 3,25,000 -> 3,40,000 (demo_bidder WON)
      {
        id: '55555555-5555-4555-8555-555555555509',
        auctionId: IDS.auctions.closedRolex,
        bidderId: 'bidder_aarav',
        amount: 31000000,
        requestId: '66666666-6666-4666-8666-666666666609',
        createdOffsetMin: -120,
      },
      {
        id: '55555555-5555-4555-8555-555555555510',
        auctionId: IDS.auctions.closedRolex,
        bidderId: 'bidder_meera',
        amount: 32500000,
        requestId: '66666666-6666-4666-8666-666666666610',
        createdOffsetMin: -80,
      },
      {
        id: '55555555-5555-4555-8555-555555555511',
        auctionId: IDS.auctions.closedRolex,
        bidderId: 'demo_bidder',
        amount: 34000000,
        requestId: '66666666-6666-4666-8666-666666666611',
        createdOffsetMin: -61,
      },
      // Closed Hasselblad: 90,000 -> 95,000 (demo_bidder) -> 1,05,000 (bidder_aarav WON)
      {
        id: '55555555-5555-4555-8555-555555555512',
        auctionId: IDS.auctions.closedHasselblad,
        bidderId: 'demo_bidder',
        amount: 9500000,
        requestId: '66666666-6666-4666-8666-666666666612',
        createdOffsetMin: -150,
      },
      {
        id: '55555555-5555-4555-8555-555555555513',
        auctionId: IDS.auctions.closedHasselblad,
        bidderId: 'bidder_aarav',
        amount: 10500000,
        requestId: '66666666-6666-4666-8666-666666666613',
        createdOffsetMin: -95,
      },
    ];

    for (const bid of bids) {
      await upsertBid(bid);
    }

    // 4. Seed watchlist entries for demo_bidder
    const watchedAuctionIds = [
      IDS.auctions.liveWatch,
      IDS.auctions.liveCamera,
      IDS.auctions.upcomingOmega,
    ];
    for (const auctionId of watchedAuctionIds) {
      await pool.query(
        `INSERT INTO watchlist (user_id, auction_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, auction_id) DO NOTHING`,
        [demoBidder.id, auctionId]
      );
    }

    // 5. Seed notifications for demo_bidder (all 4 required event types)
    const notifications = [
      {
        id: IDS.notifications.bidAccepted,
        auctionId: IDS.auctions.liveWatch,
        type: 'BID_ACCEPTED',
        title: 'Bid Accepted — Leading Lot',
        message: 'Your bid of ₹26,500 on 1969 Grand Seiko Hi-Beat 36000 is now the highest bid.',
        offsetMin: -4,
      },
      {
        id: IDS.notifications.outbid,
        auctionId: IDS.auctions.liveCamera,
        type: 'OUTBID',
        title: 'You Have Been Outbid',
        message: 'Another bidder placed ₹1,35,000 on Leica M3 Double Stroke Rangefinder (1956).',
        offsetMin: -6,
      },
      {
        id: IDS.notifications.extended,
        auctionId: IDS.auctions.closedRolex,
        type: 'AUCTION_EXTENDED',
        title: 'Anti-Sniping Extension (+30s)',
        message: 'Rolex Oyster Perpetual Datejust 1601 was extended by 30 seconds after a late bid.',
        offsetMin: -61,
      },
      {
        id: IDS.notifications.resultDeclared,
        auctionId: IDS.auctions.closedRolex,
        type: 'RESULT_DECLARED',
        title: 'Auction Won — Result Declared',
        message: 'Congratulations! You won Rolex Oyster Perpetual Datejust 1601 at ₹3,40,000.',
        offsetMin: -60,
      },
    ];

    for (const n of notifications) {
      await pool.query(
        `INSERT INTO notifications (id, user_id, auction_id, type, title, message, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, FALSE, NOW() + ($7 || ' minutes')::interval)
         ON CONFLICT (id) DO NOTHING`,
        [n.id, demoBidder.id, n.auctionId, n.type, n.title, n.message, String(n.offsetMin)]
      );
    }

    // 6. Seed 1 sample complaint for demo_admin
    await pool.query(
      `INSERT INTO complaints (id, reporter_user_id, auction_id, subject, description, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'OPEN', NOW() - INTERVAL '10 minutes')
       ON CONFLICT (id) DO NOTHING`,
      [
        IDS.complaints.sample,
        demoBidder.id,
        IDS.auctions.liveCamera,
        'Request for additional serial number provenance photo',
        'Could the host verify the lens serial number engraved on the Summicron 50mm f/2 before auction close?',
      ]
    );

    // 7. Seed 2 deterministic audit log events for demo_admin
    await pool.query(
      `INSERT INTO audit_logs (id, actor_user_id, action, target_type, target_id, details, created_at)
       VALUES
         ($1, $2, 'AUCTION_MODERATED', 'AUCTION', $3, '{"moderationStatus":"APPROVED","moderationNote":"Provenance verified"}'::jsonb, NOW() - INTERVAL '35 minutes'),
         ($4, $2, 'HOST_VERIFIED', 'USER', $5, '{"auctionMeId":"demo_host","role":"HOST"}'::jsonb, NOW() - INTERVAL '45 minutes')
       ON CONFLICT (id) DO NOTHING`,
      [
        IDS.auditLogs.approvedLot,
        demoAdmin.id,
        IDS.auctions.liveWatch,
        IDS.auditLogs.reviewedAccount,
        demoHost.id,
      ]
    );

    const countsRes = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS users,
        (SELECT COUNT(*)::int FROM auctions) AS auctions,
        (SELECT COUNT(*)::int FROM bids) AS bids,
        (SELECT COUNT(*)::int FROM watchlist) AS watchlist,
        (SELECT COUNT(*)::int FROM notifications) AS notifications,
        (SELECT COUNT(*)::int FROM complaints) AS complaints,
        (SELECT COUNT(*)::int FROM audit_logs) AS audit_logs
    `);
    const counts = countsRes.rows[0];

    console.log('[Seed] Deterministic demo data seeded successfully (idempotent):');
    console.log(
      `  Counts: users=${counts.users}, auctions=${counts.auctions}, bids=${counts.bids}, watchlist=${counts.watchlist}, notifications=${counts.notifications}, complaints=${counts.complaints}, audit_logs=${counts.audit_logs}`
    );

    if (config.nodeEnv !== 'production') {
      console.log('\n[Seed] Local Assessment Demo Accounts (password from DEMO_PASSWORD):');
      console.log(`  BIDDER : demo_bidder  | password: ${demoPassword}`);
      console.log(`  HOST   : demo_host    | password: ${demoPassword}`);
      console.log(`  ADMIN  : demo_admin   | password: ${demoPassword}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[Seed] Failed:', err);
  process.exit(1);
});
