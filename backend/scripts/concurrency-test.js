const assert = require('assert');
const crypto = require('crypto');
const http = require('http');
const { pool } = require('../src/config/db');
const { initDatabase } = require('../src/database/init');
const { createApp } = require('../src/app');
const { setupSocketServer } = require('../src/sockets/auctionSocket');
const { closeExpiredAuctions } = require('../src/services/closingService');

const createdAuctionIds = [];
const createdUserIds = [];
const bidderTokenCache = new Map();

async function getBidderToken(baseUrl, bidderId) {
  if (bidderTokenCache.has(bidderId)) {
    return bidderTokenCache.get(bidderId);
  }
  const promise = (async () => {
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: `Test ${bidderId}`,
        auctionMeId: bidderId,
        password: 'TestPassword@123',
      }),
    });
    const regBody = await regRes.json();
    if (regRes.status === 201 && regBody.token) {
      createdUserIds.push(regBody.user.id);
      return regBody.token;
    }
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auctionMeId: bidderId,
        password: 'TestPassword@123',
      }),
    });
    const loginBody = await loginRes.json();
    if (!loginRes.ok || !loginBody.token) {
      throw new Error(`Failed to authenticate test bidder ${bidderId}: ${JSON.stringify(loginBody)}`);
    }
    return loginBody.token;
  })();
  bidderTokenCache.set(bidderId, promise);
  return promise;
}

async function createTestAuction({
  title = 'Test Auction',
  status = 'LIVE',
  startingPrice = 1000000, // ₹10,000
  currentPrice = 1000000,
  minIncrement = 50000, // ₹500
  highestBidderId = null,
  startsOffsetSec = -60,
  endsOffsetSec = 120,
} = {}) {
  const res = await pool.query(
    `INSERT INTO auctions (
       title, description, status,
       starting_price, current_price, min_increment,
       highest_bidder_id, winner_id,
       starts_at, ends_at, version
     )
     VALUES (
       $1, 'Automated test fixture', $2,
       $3, $4, $5,
       $6, NULL,
       clock_timestamp() + ($7 || ' seconds')::interval,
       clock_timestamp() + ($8 || ' seconds')::interval,
       1
     )
     RETURNING *`,
    [
      title,
      status,
      startingPrice,
      currentPrice,
      minIncrement,
      highestBidderId,
      String(startsOffsetSec),
      String(endsOffsetSec),
    ]
  );
  createdAuctionIds.push(res.rows[0].id);
  return res.rows[0];
}

async function postBid(baseUrl, auctionId, payload) {
  const token = await getBidderToken(baseUrl, payload.bidderId);
  const res = await fetch(`${baseUrl}/api/auctions/${auctionId}/bids`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function getBidCount(auctionId) {
  const res = await pool.query(
    'SELECT COUNT(*)::int AS cnt FROM bids WHERE auction_id = $1',
    [auctionId]
  );
  return res.rows[0].cnt;
}

async function getAuctionRow(auctionId) {
  const res = await pool.query('SELECT * FROM auctions WHERE id = $1', [
    auctionId,
  ]);
  return res.rows[0];
}

async function runTests() {
  await initDatabase();

  let io = null;
  const app = createApp(() => io);
  const server = http.createServer(app);
  io = setupSocketServer(server, 'http://localhost:3000');

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const results = [];
  async function test(name, fn) {
    try {
      await fn();
      results.push({ name, passed: true });
      console.log(`  PASS  ${name}`);
    } catch (err) {
      results.push({ name, passed: false, error: err.message });
      console.error(`  FAIL  ${name}\n        -> ${err.message}`);
    }
  }

  console.log('\n=== Live Auction Platform — Concurrency & Correctness Test Suite ===\n');

  // 1. Simultaneous identical valid bids from 5 different bidders
  await test('Simultaneous identical valid bids: exactly 1 accepted, 4 rejected, 1 DB row', async () => {
    const auction = await createTestAuction({ title: 'Concurrent Identical Bids' });
    const bidAmount = 1050000;
    const bidders = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];

    const responses = await Promise.all(
      bidders.map((bidderId) =>
        postBid(baseUrl, auction.id, {
          bidderId,
          amount: bidAmount,
          requestId: crypto.randomUUID(),
        })
      )
    );

    const accepted = responses.filter((r) => r.status === 201);
    const rejected = responses.filter((r) => r.status === 409);

    assert.strictEqual(accepted.length, 1, `Expected 1 accepted bid, got ${accepted.length}`);
    assert.strictEqual(rejected.length, 4, `Expected 4 rejected bids, got ${rejected.length}`);
    assert.strictEqual(await getBidCount(auction.id), 1, 'Expected exactly 1 bid row in DB');

    const row = await getAuctionRow(auction.id);
    assert.strictEqual(Number(row.current_price), bidAmount);
    assert.strictEqual(row.highest_bidder_id, accepted[0].body.bid.bidderId);
    assert.strictEqual(Number(row.version), 2);
  });

  // 2. Simultaneous competing bids of different amounts: lower never overwrites higher
  await test('Simultaneous different valid bids: lower bid never overwrites higher accepted bid', async () => {
    const auction = await createTestAuction({ title: 'Concurrent Ascending Bids' });
    const amounts = [1050000, 1100000, 1200000, 1150000];

    await Promise.all(
      amounts.map((amount, idx) =>
        postBid(baseUrl, auction.id, {
          bidderId: `racer-${idx + 1}`,
          amount,
          requestId: crypto.randomUUID(),
        })
      )
    );

    const row = await getAuctionRow(auction.id);
    assert.strictEqual(
      Number(row.current_price),
      1200000,
      `Expected highest bid 1200000 to win, got ${row.current_price}`
    );
    assert.strictEqual(row.highest_bidder_id, 'racer-3');
  });

  // 3. Bid below minimum increment
  await test('Bid below minimum increment is rejected and does not alter state', async () => {
    const auction = await createTestAuction({ title: 'Below Min Increment' });
    const res = await postBid(baseUrl, auction.id, {
      bidderId: 'user-low',
      amount: 1049999,
      requestId: crypto.randomUUID(),
    });
    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.error.code, 'BID_TOO_LOW');
    assert.strictEqual(await getBidCount(auction.id), 0);
    const row = await getAuctionRow(auction.id);
    assert.strictEqual(Number(row.current_price), 1000000);
    assert.strictEqual(new Date(row.ends_at).getTime(), new Date(auction.ends_at).getTime());
  });

  // 4. Bid equal to current price
  await test('Bid equal to current price is rejected', async () => {
    const auction = await createTestAuction({ title: 'Equal Current Price' });
    const res = await postBid(baseUrl, auction.id, {
      bidderId: 'user-eq',
      amount: 1000000,
      requestId: crypto.randomUUID(),
    });
    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.error.code, 'BID_TOO_LOW');
    assert.strictEqual(await getBidCount(auction.id), 0);
  });

  // 5. Zero, negative, and invalid bid amounts
  await test('Zero, negative, decimal, and string bid amounts are rejected with 400', async () => {
    const auction = await createTestAuction({ title: 'Invalid Amounts' });
    const invalidAmounts = [0, -50000, 1050000.5, '1050000', null];

    for (const amount of invalidAmounts) {
      const res = await postBid(baseUrl, auction.id, {
        bidderId: 'user-invalid',
        amount,
        requestId: crypto.randomUUID(),
      });
      assert.strictEqual(res.status, 400, `Expected 400 for amount=${JSON.stringify(amount)}, got ${res.status}`);
      assert.strictEqual(res.body.error.code, 'INVALID_BID_AMOUNT');
    }
    assert.strictEqual(await getBidCount(auction.id), 0);
  });

  // 6. Duplicate requestId (sequential retry + concurrent duplicates)
  await test('Duplicate requestId returns original bid without creating duplicate rows', async () => {
    const auction = await createTestAuction({ title: 'Idempotency Test' });
    const requestId = crypto.randomUUID();

    // Fire 4 concurrent requests with the exact same requestId
    const concurrentRes = await Promise.all(
      Array.from({ length: 4 }, () =>
        postBid(baseUrl, auction.id, {
          bidderId: 'user-idem',
          amount: 1050000,
          requestId,
        })
      )
    );

    const created = concurrentRes.filter((r) => r.status === 201);
    const replayed = concurrentRes.filter((r) => r.status === 200 && r.body.idempotentReplay === true);
    assert.strictEqual(created.length, 1, `Expected 1 created (201), got ${created.length}`);
    assert.strictEqual(replayed.length, 3, `Expected 3 replays (200), got ${replayed.length}`);
    assert.strictEqual(await getBidCount(auction.id), 1);

    // Sequential retry after another bid moved the price up still returns the original accepted bid
    await postBid(baseUrl, auction.id, {
      bidderId: 'user-other',
      amount: 1100000,
      requestId: crypto.randomUUID(),
    });
    const retryRes = await postBid(baseUrl, auction.id, {
      bidderId: 'user-idem',
      amount: 1050000,
      requestId,
    });
    assert.strictEqual(retryRes.status, 200);
    assert.strictEqual(retryRes.body.idempotentReplay, true);
    assert.strictEqual(retryRes.body.bid.id, created[0].body.bid.id);
    assert.strictEqual(await getBidCount(auction.id), 2);
  });

  // 7. Bid before auction start
  await test('Bid before auction start is rejected', async () => {
    const auction = await createTestAuction({
      title: 'Future Scheduled Auction',
      status: 'SCHEDULED',
      startsOffsetSec: 60,
      endsOffsetSec: 300,
    });
    const res = await postBid(baseUrl, auction.id, {
      bidderId: 'user-early',
      amount: 1050000,
      requestId: crypto.randomUUID(),
    });
    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.error.code, 'AUCTION_NOT_STARTED');
    assert.strictEqual(await getBidCount(auction.id), 0);
  });

  // 8. Bid at or after expiration
  await test('Bid at or after expiration is rejected without extending deadline', async () => {
    const auction = await createTestAuction({
      title: 'Expired Auction',
      startsOffsetSec: -120,
      endsOffsetSec: -1,
    });
    const res = await postBid(baseUrl, auction.id, {
      bidderId: 'user-late',
      amount: 1050000,
      requestId: crypto.randomUUID(),
    });
    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.error.code, 'AUCTION_EXPIRED');
    const row = await getAuctionRow(auction.id);
    assert.strictEqual(new Date(row.ends_at).getTime(), new Date(auction.ends_at).getTime());
  });

  // 9. Late valid bid (<= 30s remaining) extends deadline by exactly 30 seconds
  await test('Late valid bid with <= 30s remaining extends ends_at by exactly 30 seconds', async () => {
    const auction = await createTestAuction({
      title: 'Anti-Sniping Extension',
      endsOffsetSec: 15,
    });
    const originalEndsMs = new Date(auction.ends_at).getTime();

    const res = await postBid(baseUrl, auction.id, {
      bidderId: 'sniper-1',
      amount: 1050000,
      requestId: crypto.randomUUID(),
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.extended, true);
    assert.strictEqual(res.body.extensionSeconds, 30);

    const newEndsMs = new Date(res.body.auction.endsAt).getTime();
    assert.strictEqual(
      newEndsMs - originalEndsMs,
      30000,
      `Expected exact +30000ms extension, got ${newEndsMs - originalEndsMs}ms`
    );
  });

  // 10. Bid with 31+ seconds remaining does NOT extend
  await test('Bid with > 30s remaining (31.5s) does NOT extend ends_at', async () => {
    const auction = await createTestAuction({
      title: 'No Extension Over 30s',
      endsOffsetSec: 32,
    });
    const originalEndsMs = new Date(auction.ends_at).getTime();

    const res = await postBid(baseUrl, auction.id, {
      bidderId: 'normal-bidder',
      amount: 1050000,
      requestId: crypto.randomUUID(),
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.extended, false);
    const newEndsMs = new Date(res.body.auction.endsAt).getTime();
    assert.strictEqual(newEndsMs, originalEndsMs, 'Deadline should not change when > 30s remain');
  });

  // 11. Rejected bid inside 30s window does NOT extend deadline
  await test('Rejected bid inside 30s window does NOT extend ends_at', async () => {
    const auction = await createTestAuction({
      title: 'Rejected Bid No Extension',
      endsOffsetSec: 10,
    });
    const originalEndsMs = new Date(auction.ends_at).getTime();

    const res = await postBid(baseUrl, auction.id, {
      bidderId: 'bad-sniper',
      amount: 1010000, // below min increment
      requestId: crypto.randomUUID(),
    });
    assert.strictEqual(res.status, 409);
    const row = await getAuctionRow(auction.id);
    assert.strictEqual(new Date(row.ends_at).getTime(), originalEndsMs);
  });

  // 12. Closing produces one winner + multiple simultaneous closure attempts are idempotent
  await test('Simultaneous closing worker runs close once and produce exactly one winner', async () => {
    const auction = await createTestAuction({
      title: 'Single Winner Closing',
      endsOffsetSec: 60,
    });

    // Place a valid bid first
    const bidRes = await postBid(baseUrl, auction.id, {
      bidderId: 'winning-user-99',
      amount: 1050000,
      requestId: crypto.randomUUID(),
    });
    assert.strictEqual(bidRes.status, 201);

    // Expire the auction in DB to test closing worker deterministically
    await pool.query(
      `UPDATE auctions SET ends_at = clock_timestamp() - INTERVAL '1 second' WHERE id = $1`,
      [auction.id]
    );

    // Run 5 concurrent closure attempts
    const workerRuns = await Promise.all(
      Array.from({ length: 5 }, () => closeExpiredAuctions(io))
    );
    const matchingClosures = workerRuns
      .flat()
      .filter((c) => c.auction.id === auction.id);

    assert.strictEqual(
      matchingClosures.length,
      1,
      `Expected auction to be closed exactly once across 5 concurrent workers, got ${matchingClosures.length}`
    );

    const closedRow = await getAuctionRow(auction.id);
    assert.strictEqual(closedRow.status, 'CLOSED');
    assert.strictEqual(closedRow.winner_id, 'winning-user-99');
    assert.ok(closedRow.closed_at, 'closed_at must be set');
    const versionAfterClose = Number(closedRow.version);

    // Closing an already closed auction does not change winner or version
    const secondRun = await closeExpiredAuctions(io);
    const secondMatches = secondRun.filter((c) => c.auction.id === auction.id);
    assert.strictEqual(secondMatches.length, 0);

    const rowAfterSecondRun = await getAuctionRow(auction.id);
    assert.strictEqual(rowAfterSecondRun.winner_id, 'winning-user-99');
    assert.strictEqual(Number(rowAfterSecondRun.version), versionAfterClose);
  });

  // 13. Auction without bids closes without a winner
  await test('Auction without bids closes with winner_id = null and hadBids = false', async () => {
    const auction = await createTestAuction({
      title: 'No Bids Auction',
      startsOffsetSec: -60,
      endsOffsetSec: -1,
    });

    await closeExpiredAuctions(io);
    const resultRes = await fetch(`${baseUrl}/api/auctions/${auction.id}/result`);
    const { result } = await resultRes.json();

    assert.strictEqual(result.status, 'CLOSED');
    assert.strictEqual(result.winnerId, null);
    assert.strictEqual(result.hadBids, false);
    assert.ok(result.closedAt);
  });

  // 14. Bid racing with auction closure is resolved safely via row lock
  await test('Bid racing with closing worker resolves atomically without inconsistent state', async () => {
    const auction = await createTestAuction({
      title: 'Bid vs Close Race',
      startsOffsetSec: -60,
      endsOffsetSec: 1, // expires in ~1s
    });

    // Wait right up to the boundary (950ms) and fire bid + worker concurrently
    await new Promise((r) => setTimeout(r, 950));
    const [bidRes, closeRes] = await Promise.all([
      postBid(baseUrl, auction.id, {
        bidderId: 'photo-finish-bidder',
        amount: 1050000,
        requestId: crypto.randomUUID(),
      }),
      closeExpiredAuctions(io),
    ]);

    const finalRow = await getAuctionRow(auction.id);
    const closedThisAuction = closeRes.some((c) => c.auction.id === auction.id);

    if (bidRes.status === 201) {
      // Bid won the race and extended deadline by 30s -> auction MUST still be LIVE and NOT closed
      assert.strictEqual(bidRes.body.extended, true);
      assert.strictEqual(closedThisAuction, false, 'Worker must not close an extended auction');
      assert.strictEqual(finalRow.status, 'LIVE');
      assert.strictEqual(finalRow.highest_bidder_id, 'photo-finish-bidder');
    } else {
      // Bid lost the race (expired or closed) -> must be 409 and 0 bids recorded
      assert.strictEqual(bidRes.status, 409);
      assert.strictEqual(await getBidCount(auction.id), 0);
      assert.strictEqual(finalRow.highest_bidder_id, null);
    }
  });

  // Cleanup test fixtures
  if (createdAuctionIds.length > 0) {
    await pool.query('DELETE FROM auctions WHERE id = ANY($1::uuid[])', [
      createdAuctionIds,
    ]);
  }
  if (createdUserIds.length > 0) {
    await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [
      createdUserIds,
    ]);
  }

  io.close();
  await new Promise((resolve) => server.close(resolve));
  await pool.end();

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`\n=== Summary: ${passed}/${results.length} passed, ${failed} failed ===\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(async (err) => {
  console.error('[Test Runner] Fatal error:', err);
  try {
    if (createdAuctionIds.length > 0) {
      await pool.query('DELETE FROM auctions WHERE id = ANY($1::uuid[])', [
        createdAuctionIds,
      ]);
    }
    await pool.end();
  } catch (_) {}
  process.exit(1);
});
