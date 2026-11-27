const assert = require('assert');
const crypto = require('crypto');
const path = require('path');
const { spawn } = require('child_process');
const config = require('../src/config/env');
const { pool } = require('../src/config/db');
const { io: createSocketClient } = require(
  path.resolve(__dirname, '../../frontend/node_modules/socket.io-client')
);

const TEST_PORT = 4101;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const LIVE_AUCTION_ID = '11111111-1111-4111-8111-111111111101';

async function waitForHealth(url, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return await res.json();
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server at ${url} did not become healthy within ${timeoutMs}ms`);
}

function startBackendProcess(port) {
  const child = spawn(process.execPath, [path.resolve(__dirname, '../src/server.js')], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return child;
}

async function stopBackendProcess(child) {
  if (!child || child.killed) return;
  await new Promise((resolve) => {
    child.once('exit', resolve);
    child.kill('SIGTERM');
    setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch (_) {}
      resolve();
    }, 2000);
  });
}

async function api(pathUrl, { method = 'GET', token = null, body = null } = {}) {
  const headers = {};
  if (body !== null) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${pathUrl}`, {
    method,
    headers,
    body: body !== null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function connectSocketAndJoin(auctionId) {
  const socket = createSocketClient(BASE_URL, {
    transports: ['websocket'],
    reconnection: false,
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Socket connect timeout')), 5000);
    socket.once('connect', () => {
      clearTimeout(timer);
      socket.emit('auction:join', { auctionId }, (ack) => {
        if (ack && ack.ok) resolve();
        else reject(new Error('Failed to join auction room'));
      });
    });
    socket.once('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
  return socket;
}

async function main() {
  const demoPassword = config.demoPassword;
  let serverProc = null;
  let socketA = null;
  let socketB = null;
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

  console.log('\n=== AuctionMe — 3-Role Auth, RBAC, Persistence & 2-Session Real-Time Sync ===\n');

  try {
    // Start Backend Process #1
    serverProc = startBackendProcess(TEST_PORT);
    await waitForHealth(BASE_URL);

    let bidderToken = null;
    let hostToken = null;
    let adminToken = null;
    let committedBidId = null;
    let committedAmount = null;
    let committedVersion = null;

    await test('1. demo_bidder logs in and accesses bidder routes (bids, holdings, watchlist, notifications)', async () => {
      const login = await api('/api/auth/login', {
        method: 'POST',
        body: { auctionMeId: 'demo_bidder', password: demoPassword },
      });
      assert.strictEqual(login.status, 200);
      assert.strictEqual(login.data.user.role, 'BIDDER');
      bidderToken = login.data.token;

      const [bids, holdings, watchlist, notifications] = await Promise.all([
        api('/api/me/bids', { token: bidderToken }),
        api('/api/me/holdings', { token: bidderToken }),
        api('/api/me/watchlist', { token: bidderToken }),
        api('/api/me/notifications', { token: bidderToken }),
      ]);
      assert.strictEqual(bids.status, 200);
      assert.ok(bids.data.bids.length >= 4);
      assert.strictEqual(holdings.status, 200);
      assert.ok(holdings.data.wonAuctions.length >= 1);
      assert.strictEqual(watchlist.status, 200);
      assert.ok(watchlist.data.auctionIds.length >= 3);
      assert.strictEqual(notifications.status, 200);
      assert.strictEqual(notifications.data.notifications.length, 4);
    });

    await test('2. demo_host logs in and accesses Host routes', async () => {
      const login = await api('/api/auth/login', {
        method: 'POST',
        body: { auctionMeId: 'demo_host', password: demoPassword },
      });
      assert.strictEqual(login.status, 200);
      assert.strictEqual(login.data.user.role, 'HOST');
      hostToken = login.data.token;

      const hostAuctions = await api('/api/host/auctions', { token: hostToken });
      assert.strictEqual(hostAuctions.status, 200);
      assert.ok(hostAuctions.data.auctions.length >= 7);
    });

    await test('3. demo_admin logs in and accesses Admin routes (users, auctions, complaints, audit logs)', async () => {
      const login = await api('/api/auth/login', {
        method: 'POST',
        body: { auctionMeId: 'demo_admin', password: demoPassword },
      });
      assert.strictEqual(login.status, 200);
      assert.strictEqual(login.data.user.role, 'ADMIN');
      adminToken = login.data.token;

      const [users, auctions, complaints, logs] = await Promise.all([
        api('/api/admin/users', { token: adminToken }),
        api('/api/admin/auctions', { token: adminToken }),
        api('/api/admin/complaints', { token: adminToken }),
        api('/api/admin/audit-logs', { token: adminToken }),
      ]);
      assert.strictEqual(users.status, 200);
      assert.ok(users.data.users.length >= 5);
      assert.strictEqual(auctions.status, 200);
      assert.ok(auctions.data.auctions.length >= 7);
      assert.strictEqual(complaints.status, 200);
      assert.ok(complaints.data.complaints.length >= 1);
      assert.strictEqual(logs.status, 200);
      assert.ok(logs.data.logs.length >= 2);
    });

    await test('4-7. RBAC enforcement: Bidder/Host blocked from privileged routes, Admin cannot manipulate bids/results, invalid credentials rejected', async () => {
      // Bidder cannot access Host or Admin
      assert.strictEqual((await api('/api/host/auctions', { token: bidderToken })).status, 403);
      assert.strictEqual((await api('/api/admin/users', { token: bidderToken })).status, 403);

      // Host cannot access Admin or place bids
      assert.strictEqual((await api('/api/admin/users', { token: hostToken })).status, 403);
      const hostBid = await api(`/api/auctions/${LIVE_AUCTION_ID}/bids`, {
        method: 'POST',
        token: hostToken,
        body: { amount: 99999900, requestId: crypto.randomUUID() },
      });
      assert.strictEqual(hostBid.status, 403);

      // Admin cannot manipulate accepted bids or auction results
      const adminCheat = await api(`/api/host/auctions/${LIVE_AUCTION_ID}`, {
        method: 'PATCH',
        token: adminToken,
        body: { winnerId: 'demo_admin', currentPrice: 100 },
      });
      assert.strictEqual(adminCheat.status, 403);
      assert.strictEqual(adminCheat.data.error.code, 'FORBIDDEN_FIELD_MODIFICATION');

      // Invalid credentials rejected
      const badLogin = await api('/api/auth/login', {
        method: 'POST',
        body: { auctionMeId: 'demo_bidder', password: 'WrongPassword!999' },
      });
      assert.strictEqual(badLogin.status, 401);
    });

    await test('8. Two independent Socket.IO sessions receive real-time post-commit bid update simultaneously', async () => {
      const before = await api(`/api/auctions/${LIVE_AUCTION_ID}`);
      assert.strictEqual(before.status, 200);
      const nextAmount = before.data.auction.minNextBid;

      // Open two independent client sessions (simulating two independent browser tabs/sessions)
      socketA = await connectSocketAndJoin(LIVE_AUCTION_ID);
      socketB = await connectSocketAndJoin(LIVE_AUCTION_ID);

      const waitUpdateA = new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('Session A missed auction:update')), 5000);
        socketA.once('auction:update', (payload) => {
          clearTimeout(t);
          resolve(payload);
        });
      });
      const waitUpdateB = new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('Session B missed auction:update')), 5000);
        socketB.once('auction:update', (payload) => {
          clearTimeout(t);
          resolve(payload);
        });
      });

      const bidRes = await api(`/api/auctions/${LIVE_AUCTION_ID}/bids`, {
        method: 'POST',
        token: bidderToken,
        body: { amount: nextAmount, requestId: crypto.randomUUID() },
      });
      assert.strictEqual(bidRes.status, 201);
      committedBidId = bidRes.data.bid.id;
      committedAmount = bidRes.data.bid.amount;
      committedVersion = bidRes.data.auction.version;

      const [updateA, updateB] = await Promise.all([waitUpdateA, waitUpdateB]);
      assert.strictEqual(updateA.bid.id, committedBidId);
      assert.strictEqual(updateB.bid.id, committedBidId);
      assert.strictEqual(updateA.auction.currentPrice, committedAmount);
      assert.strictEqual(updateB.auction.currentPrice, committedAmount);
      assert.strictEqual(updateA.version, committedVersion);
      assert.strictEqual(updateB.version, committedVersion);

      socketA.disconnect();
      socketB.disconnect();
    });

    await test('9. Full backend restart: users, sessions, auctions, committed bid, and results survive in PostgreSQL', async () => {
      // Completely kill Backend Process #1
      await stopBackendProcess(serverProc);
      serverProc = null;

      // Start fresh Backend Process #2 on the same port
      serverProc = startBackendProcess(TEST_PORT);
      await waitForHealth(BASE_URL);

      // Existing session token still authenticates against PostgreSQL user_sessions
      const meAfterRestart = await api('/api/auth/me', { token: bidderToken });
      assert.strictEqual(meAfterRestart.status, 200);
      assert.strictEqual(meAfterRestart.data.user.auctionMeId, 'demo_bidder');

      // Auction state and committed bid survived restart
      const auctionAfter = await api(`/api/auctions/${LIVE_AUCTION_ID}`);
      assert.strictEqual(auctionAfter.status, 200);
      assert.strictEqual(auctionAfter.data.auction.currentPrice, committedAmount);
      assert.strictEqual(auctionAfter.data.auction.version, committedVersion);

      const bidsAfter = await api(`/api/auctions/${LIVE_AUCTION_ID}/bids`);
      assert.ok(bidsAfter.data.bids.some((b) => b.id === committedBidId));

      // Completed auction winner survived restart
      const closedResult = await api('/api/auctions/11111111-1111-4111-8111-111111111106/result');
      assert.strictEqual(closedResult.status, 200);
      assert.strictEqual(closedResult.data.result.status, 'CLOSED');
      assert.strictEqual(closedResult.data.result.winnerId, 'demo_bidder');
    });
  } finally {
    if (socketA) socketA.disconnect();
    if (socketB) socketB.disconnect();
    await stopBackendProcess(serverProc);
    await pool.end();
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`\n=== Persistence & Role Verification: ${passed}/${results.length} passed, ${failed} failed ===\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[Verify Persistence & Roles] Fatal error:', err);
  process.exit(1);
});
