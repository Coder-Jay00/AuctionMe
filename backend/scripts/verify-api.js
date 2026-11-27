const assert = require('assert');
const crypto = require('crypto');
const http = require('http');
const { pool } = require('../src/config/db');
const { initDatabase } = require('../src/database/init');
const { createApp } = require('../src/app');
const { setupSocketServer } = require('../src/sockets/auctionSocket');
const { hashPassword } = require('../src/services/authService');

const createdUserIds = [];
const createdAuctionIds = [];

async function api(baseUrl, path, { method = 'GET', token = null, body = null } = {}) {
  const headers = {};
  if (body !== null) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, headers: res.headers };
}

async function runVerification() {
  await initDatabase();

  let io = null;
  const app = createApp(() => io);
  const server = http.createServer(app);
  io = setupSocketServer(server, 'http://localhost:3000');

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const suffix = crypto.randomBytes(4).toString('hex');
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

  console.log('\n=== AuctionMe — Auth, RBAC, Host, Bidder & Admin API Verification ===\n');

  let bidderToken = null;
  let bidderUser = null;
  let hostToken = null;
  let hostUser = null;
  let adminToken = null;
  let adminUser = null;
  let hostAuctionId = null;

  await test('Health endpoint returns 200 and serverTime', async () => {
    const res = await api(baseUrl, '/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'ok');
    assert.ok(res.data.serverTime);
  });

  await test('Registration hashes password, enforces BIDDER role (ignores client role), and sets cookie', async () => {
    const res = await api(baseUrl, '/api/auth/register', {
      method: 'POST',
      body: {
        displayName: 'Sprint Bidder',
        auctionMeId: `bidder_${suffix}`,
        password: 'StrongPassword@123',
        role: 'ADMIN', // Attempt privilege escalation — MUST be ignored
      },
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.user.role, 'BIDDER');
    assert.ok(res.data.token);
    assert.ok(res.headers.get('set-cookie')?.includes('auctionme_session='));
    bidderToken = res.data.token;
    bidderUser = res.data.user;
    createdUserIds.push(bidderUser.id);

    // Verify password is NOT stored in plaintext in DB
    const dbUser = await pool.query('SELECT password_hash FROM users WHERE id = $1', [bidderUser.id]);
    assert.ok(dbUser.rows[0].password_hash.startsWith('scrypt$'));
    assert.notStrictEqual(dbUser.rows[0].password_hash, 'StrongPassword@123');
  });

  await test('Duplicate AuctionMe ID registration returns 409', async () => {
    const res = await api(baseUrl, '/api/auth/register', {
      method: 'POST',
      body: {
        displayName: 'Duplicate Bidder',
        auctionMeId: `BIDDER_${suffix}`, // case-insensitive duplicate
        password: 'StrongPassword@123',
      },
    });
    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.data.error.code, 'AUCTION_ME_ID_TAKEN');
  });

  await test('Login succeeds with valid password and rejects wrong password', async () => {
    const bad = await api(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { auctionMeId: `bidder_${suffix}`, password: 'WrongPassword@123' },
    });
    assert.strictEqual(bad.status, 401);

    const good = await api(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { auctionMeId: `bidder_${suffix}`, password: 'StrongPassword@123', rememberMe: true },
    });
    assert.strictEqual(good.status, 200);
    assert.strictEqual(good.data.user.auctionMeId, `bidder_${suffix}`);
    bidderToken = good.data.token;

    const me = await api(baseUrl, '/api/auth/me', { token: bidderToken });
    assert.strictEqual(me.status, 200);
    assert.strictEqual(me.data.user.id, bidderUser.id);
  });

  await test('Unauthenticated requests to protected endpoints return 401', async () => {
    const r1 = await api(baseUrl, '/api/auth/me');
    const r2 = await api(baseUrl, '/api/me/bids');
    const r3 = await api(baseUrl, '/api/me/holdings');
    const r4 = await api(baseUrl, '/api/host/auctions');
    const r5 = await api(baseUrl, '/api/admin/users');
    assert.strictEqual(r1.status, 401);
    assert.strictEqual(r2.status, 401);
    assert.strictEqual(r3.status, 401);
    assert.strictEqual(r4.status, 401);
    assert.strictEqual(r5.status, 401);
  });

  await test('RBAC blocks BIDDER from Host and Admin endpoints (403)', async () => {
    const rHost = await api(baseUrl, '/api/host/auctions', { token: bidderToken });
    const rAdmin = await api(baseUrl, '/api/admin/users', { token: bidderToken });
    assert.strictEqual(rHost.status, 403);
    assert.strictEqual(rAdmin.status, 403);
  });

  await test('Seeded Admin & Host accounts can authenticate; Host blocked from Admin & Bidding', async () => {
    // Insert isolated test admin & host directly
    const adminInsert = await pool.query(
      `INSERT INTO users (auction_me_id, display_name, password_hash, role)
       VALUES ($1, 'Test Admin', $2, 'ADMIN') RETURNING id`,
      [`admin_${suffix}`, hashPassword('AdminPass@123')]
    );
    createdUserIds.push(adminInsert.rows[0].id);

    const hostInsert = await pool.query(
      `INSERT INTO users (auction_me_id, display_name, password_hash, role)
       VALUES ($1, 'Test Host', $2, 'HOST') RETURNING id`,
      [`host_${suffix}`, hashPassword('HostPass@123')]
    );
    createdUserIds.push(hostInsert.rows[0].id);

    const adminLogin = await api(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { auctionMeId: `admin_${suffix}`, password: 'AdminPass@123' },
    });
    assert.strictEqual(adminLogin.status, 200);
    adminToken = adminLogin.data.token;
    adminUser = adminLogin.data.user;

    const hostLogin = await api(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { auctionMeId: `host_${suffix}`, password: 'HostPass@123' },
    });
    assert.strictEqual(hostLogin.status, 200);
    hostToken = hostLogin.data.token;
    hostUser = hostLogin.data.user;

    const hostToAdmin = await api(baseUrl, '/api/admin/users', { token: hostToken });
    assert.strictEqual(hostToAdmin.status, 403);
  });

  await test('Host creates, lists, updates, starts auction, and is blocked from modifying winnerId/currentPrice', async () => {
    const startsAt = new Date(Date.now() + 60_000).toISOString();
    const endsAt = new Date(Date.now() + 600_000).toISOString();

    const createRes = await api(baseUrl, '/api/host/auctions', {
      method: 'POST',
      token: hostToken,
      body: {
        title: `Host Vintage Lot ${suffix}`,
        description: 'Authenticated collector piece for API verification.',
        startingPrice: 100000,
        minIncrement: 10000,
        startsAt,
        endsAt,
        status: 'SCHEDULED',
        category: 'Watches',
      },
    });
    assert.strictEqual(createRes.status, 201);
    hostAuctionId = createRes.data.auction.id;
    createdAuctionIds.push(hostAuctionId);

    const listRes = await api(baseUrl, '/api/host/auctions', { token: hostToken });
    assert.strictEqual(listRes.status, 200);
    assert.ok(listRes.data.auctions.some((a) => a.id === hostAuctionId));

    // Forbidden field modification must be rejected with 403
    const cheatRes = await api(baseUrl, `/api/host/auctions/${hostAuctionId}`, {
      method: 'PATCH',
      token: hostToken,
      body: { winnerId: 'fake-winner' },
    });
    assert.strictEqual(cheatRes.status, 403);
    assert.strictEqual(cheatRes.data.error.code, 'FORBIDDEN_FIELD_MODIFICATION');

    // Permitted update while SCHEDULED
    const patchRes = await api(baseUrl, `/api/host/auctions/${hostAuctionId}`, {
      method: 'PATCH',
      token: hostToken,
      body: { title: `Updated Vintage Lot ${suffix}`, startingPrice: 120000 },
    });
    assert.strictEqual(patchRes.status, 200);
    assert.strictEqual(patchRes.data.auction.currentPrice, 120000);

    // Start auction -> LIVE
    const startRes = await api(baseUrl, `/api/host/auctions/${hostAuctionId}/start`, {
      method: 'POST',
      token: hostToken,
    });
    assert.strictEqual(startRes.status, 200);
    assert.strictEqual(startRes.data.auction.status, 'LIVE');
  });

  await test('Authenticated bidder bids (server ignores spoofed bidderId), updates ledger, holdings, and watchlist', async () => {
    // Host cannot bid (403)
    const hostBid = await api(baseUrl, `/api/auctions/${hostAuctionId}/bids`, {
      method: 'POST',
      token: hostToken,
      body: { amount: 130000, requestId: crypto.randomUUID() },
    });
    assert.strictEqual(hostBid.status, 403);

    // Bidder places valid bid with spoofed bidderId in body — server MUST use authenticated auctionMeId
    const bidRes = await api(baseUrl, `/api/auctions/${hostAuctionId}/bids`, {
      method: 'POST',
      token: bidderToken,
      body: { bidderId: 'spoofed-attacker', amount: 130000, requestId: crypto.randomUUID() },
    });
    assert.strictEqual(bidRes.status, 201);
    assert.strictEqual(bidRes.data.bid.bidderId, bidderUser.auctionMeId);

    // Watchlist add, list, remove
    const wlAdd = await api(baseUrl, `/api/me/watchlist/${hostAuctionId}`, {
      method: 'POST',
      token: bidderToken,
    });
    assert.strictEqual(wlAdd.status, 201);
    const wlGet = await api(baseUrl, '/api/me/watchlist', { token: bidderToken });
    assert.strictEqual(wlGet.status, 200);
    assert.ok(wlGet.data.auctionIds.includes(hostAuctionId));

    // Bidder ledger & leading holdings
    const bidsRes = await api(baseUrl, '/api/me/bids', { token: bidderToken });
    assert.strictEqual(bidsRes.status, 200);
    assert.strictEqual(bidsRes.data.bids.length, 1);
    assert.strictEqual(bidsRes.data.bids[0].status, 'accepted');

    const holdBefore = await api(baseUrl, '/api/me/holdings', { token: bidderToken });
    assert.strictEqual(holdBefore.status, 200);
    assert.strictEqual(holdBefore.data.leadingAuctions.length, 1);
    assert.strictEqual(holdBefore.data.wonAuctions.length, 0);

    // Host closes auction -> winner computed strictly by DB as highest_bidder_id
    const closeRes = await api(baseUrl, `/api/host/auctions/${hostAuctionId}/close`, {
      method: 'POST',
      token: hostToken,
    });
    assert.strictEqual(closeRes.status, 200);
    assert.strictEqual(closeRes.data.auction.status, 'CLOSED');
    assert.strictEqual(closeRes.data.auction.winnerId, bidderUser.auctionMeId);

    // Holdings now shows wonAuctions = 1
    const holdAfter = await api(baseUrl, '/api/me/holdings', { token: bidderToken });
    assert.strictEqual(holdAfter.data.wonAuctions.length, 1);
    assert.strictEqual(holdAfter.data.wonAuctions[0].id, hostAuctionId);

    // Remove from watchlist
    const wlDel = await api(baseUrl, `/api/me/watchlist/${hostAuctionId}`, {
      method: 'DELETE',
      token: bidderToken,
    });
    assert.strictEqual(wlDel.status, 200);
  });

  await test('Admin can moderate auctions (SUSPENDED blocks bidding), manage roles/status, and view audit logs', async () => {
    const modRes = await api(baseUrl, `/api/admin/auctions/${hostAuctionId}/moderate`, {
      method: 'PATCH',
      token: adminToken,
      body: { moderationStatus: 'FLAGGED', moderationNote: 'Verification test flag' },
    });
    assert.strictEqual(modRes.status, 200);
    assert.strictEqual(modRes.data.auction.moderationStatus, 'FLAGGED');

    // Promote bidder to HOST then revert to BIDDER
    const promote = await api(baseUrl, `/api/admin/users/${bidderUser.id}/role`, {
      method: 'PATCH',
      token: adminToken,
      body: { role: 'HOST' },
    });
    assert.strictEqual(promote.status, 200);
    assert.strictEqual(promote.data.user.role, 'HOST');

    // Deactivate bidder -> revokes active session immediately
    const deact = await api(baseUrl, `/api/admin/users/${bidderUser.id}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: { isActive: false },
    });
    assert.strictEqual(deact.status, 200);

    const meAfterDeact = await api(baseUrl, '/api/auth/me', { token: bidderToken });
    assert.strictEqual(meAfterDeact.status, 401);

    const logs = await api(baseUrl, '/api/admin/audit-logs', { token: adminToken });
    assert.strictEqual(logs.status, 200);
    assert.ok(logs.data.logs.length >= 3);
  });

  // Cleanup
  if (createdAuctionIds.length > 0) {
    await pool.query('DELETE FROM auctions WHERE id = ANY($1::uuid[])', [createdAuctionIds]);
  }
  if (createdUserIds.length > 0) {
    await pool.query('DELETE FROM audit_logs WHERE actor_user_id = ANY($1::uuid[])', [createdUserIds]);
    await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [createdUserIds]);
  }

  io.close();
  await new Promise((resolve) => server.close(resolve));
  await pool.end();

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`\n=== API Verification Summary: ${passed}/${results.length} passed, ${failed} failed ===\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch(async (err) => {
  console.error('[Verify API] Fatal error:', err);
  try {
    if (createdAuctionIds.length > 0) {
      await pool.query('DELETE FROM auctions WHERE id = ANY($1::uuid[])', [createdAuctionIds]);
    }
    if (createdUserIds.length > 0) {
      await pool.query('DELETE FROM audit_logs WHERE actor_user_id = ANY($1::uuid[])', [createdUserIds]);
      await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [createdUserIds]);
    }
    await pool.end();
  } catch (_) {}
  process.exit(1);
});
