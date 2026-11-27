# Live Auction Platform — Full-Stack MVP

A transaction-safe, real-time **Live Auction Platform MVP** built with **Next.js (App Router)**, **React**, **Express.js**, **Socket.IO**, and **PostgreSQL**.

Designed around strict financial correctness: concurrent bids are serialized via PostgreSQL row locks (`SELECT ... FOR UPDATE`), late bids within 30 seconds atomically extend the deadline using PostgreSQL `clock_timestamp()`, and a background closing worker guarantees **exactly one winner** (or a clean no-bids close) with zero race conditions.

---

## 1. Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router), React 18, JavaScript (ES6+), Tailwind CSS, `socket.io-client` |
| **Backend** | Node.js, Express.js, Socket.IO, `pg` (node-postgres) |
| **Database** | PostgreSQL 16+ (Docker Compose or local PostgreSQL) |
| **Testing** | Node.js `assert` + real concurrent HTTP (`fetch`) + real PostgreSQL transactions |

---

## 2. Architecture

```text
+-----------------------------------+
|      Next.js Frontend (:3000)     |
|  App Router · React · Tailwind    |
|  - Initial state via REST API     |
|  - Live updates via Socket.IO     |
|  - Stale version filtering        |
+-----------------+-----------------+
                  |  REST (HTTP) + WebSocket (Socket.IO)
                  v
+-----------------------------------+
|   Express + Socket.IO (:4000)     |
|  - REST API (/api/auctions/...)   |
|  - Transactional Bidding Engine   |
|  - Auction Rooms (auction:<id>)   |
|  - Closing Worker (1s interval)   |
+-----------------+-----------------+
                  |  pg Pool (ACID Transactions)
                  v
+-----------------------------------+
|        PostgreSQL (:5432)         |
|  - auctions (row lock + version)  |
|  - bids (UNIQUE auction, req_id)  |
|  - Authoritative clock_timestamp  |
+-----------------------------------+
```

- **Strict separation:** Next.js serves only the frontend UI (no Next.js API routes). Express.js is the single authoritative API and Socket.IO server.
- **No optimistic fake bids:** UI state updates strictly from committed backend REST responses and post-commit Socket.IO events.

---

## 3. Database Design

All monetary values are stored in **integer paise** (`BIGINT`, where `100 paise = ₹1.00`) to avoid floating-point rounding errors. The frontend formats amounts in INR (`en-IN`).

### `auctions`
| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | Default `gen_random_uuid()` |
| `title` | `TEXT` | Auction item title |
| `description` | `TEXT` | Item description |
| `status` | `VARCHAR(20)` | `SCHEDULED`, `LIVE`, or `CLOSED` |
| `starting_price` | `BIGINT` | Starting price in paise |
| `current_price` | `BIGINT` | Latest accepted price in paise |
| `min_increment` | `BIGINT` | Minimum bid increment in paise |
| `highest_bidder_id` | `TEXT` | Current highest bidder (nullable) |
| `winner_id` | `TEXT` | Set atomically when status transitions to `CLOSED` |
| `starts_at` | `TIMESTAMPTZ` | Authoritative start time |
| `ends_at` | `TIMESTAMPTZ` | Authoritative end time (extended by +30s on anti-sniping) |
| `closed_at` | `TIMESTAMPTZ` | Set atomically on closure |
| `version` | `BIGINT` | Monotonically increasing state version for stale-event filtering |
| `created_at` | `TIMESTAMPTZ` | Creation timestamp |

### `bids`
| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | Default `gen_random_uuid()` |
| `auction_id` | `UUID FK` | References `auctions(id) ON DELETE CASCADE` |
| `bidder_id` | `TEXT` | Bidder identifier |
| `amount` | `BIGINT` | Bid amount in paise (`> 0`) |
| `request_id` | `UUID` | Client idempotency key |
| `created_at` | `TIMESTAMPTZ` | Acceptance timestamp |
| **Constraint** | `UNIQUE (auction_id, request_id)` | Prevents duplicate bid creation on retries |

### Indexes
- `idx_auctions_status_ends_at (status, ends_at)` — Fast closing worker scan for expired `LIVE` auctions.
- `idx_bids_auction_created_at (auction_id, created_at DESC)` — Fast bid history retrieval.
- `idx_bids_request_id (request_id)` + `bids_auction_request_unique (auction_id, request_id)` — Fast idempotency checks.

---

## 4. Local Installation & Setup

### Prerequisites
- Node.js 20+ and npm
- Docker Desktop (for `docker compose`) **or** a local PostgreSQL 16+ instance

### Step 1: Configure Environment Variables
Copy `.env.example` to `.env` (or `backend/.env`) and `frontend/.env.local` if customizing defaults.

### Step 2: Start PostgreSQL
Using Docker Compose:
```bash
docker compose up -d postgres
```
*(If a local PostgreSQL service is already running on port 5432, either point `DATABASE_URL` in `backend/.env` to your local PostgreSQL instance or set `POSTGRES_PORT=5433` in `.env` before running `docker compose up -d postgres`.)*

### Step 3: Install Dependencies, Initialize & Seed Database
```bash
# Backend
cd backend
npm install
npm run db:init
npm run db:seed

# Frontend (in a separate terminal)
cd frontend
npm install
```

### Step 4: Run Backend & Frontend
```bash
# Terminal 1 — Express API + Socket.IO (:4000)
cd backend
npm run dev

# Terminal 2 — Next.js Frontend (:3000)
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in two browser tabs with different demo Bidder IDs to observe real-time synchronized bidding, anti-sniping extensions, and atomic closing.

---

## 5. Environment Variables

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_USER` | `auction_user` | PostgreSQL username (Docker Compose) |
| `POSTGRES_PASSWORD` | `auction_pass` | PostgreSQL password (Docker Compose) |
| `POSTGRES_DB` | `live_auction` | PostgreSQL database name |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `DATABASE_URL` | `postgresql://auction_user:auction_pass@localhost:5432/live_auction` | Full connection URI used by Express |
| `PORT` | `4000` | Express HTTP + Socket.IO port |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed frontend origin(s) |
| `CLOSING_WORKER_INTERVAL_MS` | `1000` | Interval (ms) between closing worker ticks |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Express REST API URL for Next.js |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:4000` | Express Socket.IO URL for Next.js |

---

## 6. REST API Documentation

### `GET /api/health`
Returns server and PostgreSQL connectivity status with authoritative `serverTime`.

### `GET /api/auctions`
Lists auctions ordered by `LIVE` first, returning current state, `minNextBid`, `bidCount`, and `serverTime`.

### `GET /api/auctions/:id`
Returns authoritative auction state including `currentPrice`, `minIncrement`, `minNextBid`, `endsAt`, `version`, `bidCount`, and `serverTime`.

### `GET /api/auctions/:id/bids?limit=50`
Returns accepted bids for the auction ordered newest first.

### `POST /api/auctions/:id/bids`
Places a transaction-safe bid.

**Request Body:**
```json
{
  "bidderId": "demo-user-101",
  "amount": 2700000,
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Success (`201 Created` for new bid, `200 OK` for idempotent replay):**
```json
{
  "accepted": true,
  "idempotentReplay": false,
  "extended": true,
  "extensionSeconds": 30,
  "bid": { "id": "...", "bidderId": "demo-user-101", "amount": 2700000, "requestId": "..." },
  "auction": { "id": "...", "currentPrice": 2700000, "version": 4, "endsAt": "..." },
  "serverTime": "..."
}
```

**Error (`400`, `404`, `409`):**
```json
{
  "accepted": false,
  "error": {
    "code": "BID_TOO_LOW",
    "message": "Bid rejected. Minimum next bid is ₹27,500."
  }
}
```

### `GET /api/auctions/:id/result`
Returns auction status, `winnerId`, `finalPrice`, `hadBids`, `closedAt`, and `version`.

---

## 7. Bidding Transaction & Concurrency Guarantees

Every `POST /api/auctions/:id/bids` executes inside a single PostgreSQL transaction:

1. `BEGIN`
2. `SELECT * FROM auctions WHERE id = $1 FOR UPDATE` — acquires an exclusive row-level lock, serializing all concurrent bids and closing worker attempts for this auction.
3. `SELECT clock_timestamp()` — captures the authoritative database time **after** lock acquisition (never trusts client clocks).
4. **Idempotency check:** Looks up `(auction_id, request_id)` in `bids`. If already accepted, commits and returns the original bid result (`200 OK`, `idempotentReplay: true`) without inserting a duplicate.
5. **Status & time window check:** Rejects if `SCHEDULED` / before `starts_at`, if `CLOSED`, or if `clock_timestamp() >= ends_at`.
6. **Minimum increment check:** Rejects if `amount < current_price + min_increment`.
7. **Insert & Update:** Inserts the bid into `bids`, updates `current_price`, `highest_bidder_id`, increments `version`, and conditionally extends `ends_at` by `INTERVAL '30 seconds'`.
8. `COMMIT`
9. **Post-commit broadcast:** Emits `auction:update` via Socket.IO **only after** `COMMIT` succeeds. Any failure rolls back the transaction cleanly.

---

## 8. Anti-Sniping Logic

Evaluated inside the locked PostgreSQL transaction using `clock_timestamp()`:

- If `(ends_at - clock_timestamp()) <= INTERVAL '30 seconds'` and the bid is **accepted**:
  `ends_at = ends_at + INTERVAL '30 seconds'`.
- **31 seconds remaining:** No extension.
- **Exactly 30 seconds remaining:** Extended by 30 seconds.
- **5 seconds remaining:** Extended by 30 seconds.
- **Expired (`clock_timestamp() >= ends_at`):** Rejected, no extension.
- **Rejected bid (too low / invalid):** Rolled back, no extension.
- Repeated valid late bids can extend the deadline repeatedly.

---

## 9. Auction Closing Worker

`backend/src/workers/closingWorker.js` runs every 1 second and invokes `closeExpiredAuctions(io)`:

1. `BEGIN`
2. `SELECT id FROM auctions WHERE status = 'LIVE' AND ends_at <= clock_timestamp() FOR UPDATE SKIP LOCKED`
3. For each locked row, executes:
   ```sql
   UPDATE auctions
   SET status = 'CLOSED',
       winner_id = highest_bidder_id,
       closed_at = clock_timestamp(),
       version = version + 1
   WHERE id = $1
     AND status = 'LIVE'
     AND ends_at <= clock_timestamp()
   RETURNING *;
   ```
4. `COMMIT`
5. Emits `auction:closed` to `auction:<auctionId>` after commit.

- **Single-winner guarantee:** `FOR UPDATE SKIP LOCKED` + the `status = 'LIVE'` predicate ensures concurrent workers or repeated ticks never double-close or overwrite `winner_id`.
- **No-bids handling:** If `highest_bidder_id` is `NULL`, `winner_id` remains `NULL`.
- **Bid-vs-Close race safety:** Both bidding and closing lock the exact same `auctions` row. If a late bid acquires the lock first and extends `ends_at` by 30s, the worker skips it and on the next tick sees the extended deadline. If the worker locks and closes first, the racing bid sees `status = 'CLOSED'` and is rejected.

---

## 10. Socket.IO Events

Room naming: `auction:<auctionId>`

| Direction | Event | Payload / Behavior |
|---|---|---|
| Client → Server | `auction:join` | `{ auctionId }` — joins room `auction:<auctionId>` |
| Client → Server | `auction:leave` | `{ auctionId }` — leaves room |
| Server → Room | `auction:update` | `{ auction, bid, version, extended, extensionSeconds, previousEndsAt, serverTime }` |
| Server → Room | `auction:closed` | `{ auction, auctionId, status, winnerId, finalPrice, closedAt, hadBids, version, serverTime }` |
| Server → Socket | `bid:rejected` | `{ auctionId, bidderId, requestId, code, message, details, timestamp }` |

The frontend tracks `versionRef.current` and ignores any Socket.IO event with `payload.version <= versionRef.current`. On reconnect, the client re-joins the room and fetches fresh REST state to recover any missed updates.

---

## 11. Running Tests

Run the deterministic concurrency & edge-case test suite against PostgreSQL:

```bash
cd backend
npm run test:concurrency
```

The suite spins up an isolated Express + Socket.IO server against PostgreSQL, creates fresh test auction fixtures, runs real concurrent HTTP requests (`Promise.all`) and concurrent worker runs, verifies all 14 concurrency/anti-sniping/closing invariants, and cleans up its fixtures automatically.

---

## 12. Scalability Design (50,000 Simultaneous Auctions & 200,000 Watchers on One Auction)

> **Implemented MVP vs. Production Scaling:**
> The current MVP implements single-node Express + Socket.IO, single-instance PostgreSQL with `SELECT ... FOR UPDATE`, indexed queries, `FOR UPDATE SKIP LOCKED` closing worker, and versioned Socket.IO events. Below are the **six production scaling pillars** required to scale to **50,000 simultaneous auctions** and **200,000 concurrent watchers on a single hot auction**.

### 1. Horizontally Scaled API and Socket.IO Instances
- **MVP:** Single Node.js process handling both REST writes and Socket.IO connections.
- **Production:** Decouple stateless **Bid API nodes** from **WebSocket Fan-Out Gateway nodes** behind an L7 load balancer (e.g., NGINX / AWS ALB / Envoy). Scale Socket.IO gateways horizontally (e.g., 20–40 nodes handling 5,000–10,000 concurrent WebSocket connections each to comfortably absorb 200,000 watchers on one auction) with sticky sessions only during the initial HTTP-to-WebSocket upgrade handshake. Apply per-bidder rate limiting and short-circuit obviously stale bids at the API edge before touching PostgreSQL.

### 2. Redis Pub/Sub or Socket.IO Redis Adapter
- **MVP:** In-memory Socket.IO rooms (`io.to('auction:<id>')`) on a single server.
- **Production:** Attach the `@socket.io/redis-streams-adapter` (or Redis Cluster Pub/Sub / Kafka fan-out bus) across all WebSocket gateway nodes so a committed bid on API Node A is broadcast to all 200,000 watchers connected across Gateway Nodes 1..N. For ultra-hot auctions (200k watchers, dozens of bids/sec), coalesce/throttle high-frequency `auction:update` broadcasts (e.g., 100–250ms micro-batching of latest committed state + recent bids) to prevent outbound network saturation while preserving final state accuracy.

### 3. PostgreSQL Transaction-Based Auction Correctness
- **MVP:** Direct `SELECT ... FOR UPDATE` row locking in PostgreSQL per bid transaction.
- **Production:** Retain PostgreSQL ACID transactions as the authoritative source of truth for bid acceptance, anti-sniping, and winner finality. Protect the database from lock-queue exhaustion on hot auctions by placing **PgBouncer** (transaction pooling) in front of PostgreSQL, enforcing tight `lock_timeout` and `statement_timeout` (e.g., 500ms–1s), and optionally using a **Redis pre-filter** (caching latest `current_price + min_increment`) to reject 90%+ of stale/low bids before they ever contend on the PostgreSQL row lock.

### 4. Database Indexing and Partitioning / Sharding
- **MVP:** Single PostgreSQL database with composite indexes `(status, ends_at)` and `(auction_id, created_at DESC)`.
- **Production:**
  - **Partial index** for closing: `CREATE INDEX idx_live_auctions_ends_at ON auctions (ends_at) WHERE status = 'LIVE';` — keeps the hot index tiny even with millions of historical closed auctions.
  - **Table partitioning:** Partition `bids` by `created_at` (time-range) or hash of `auction_id`, and archive closed auctions to cold storage.
  - **Horizontal sharding & read replicas:** Route read-heavy `GET /api/auctions/:id` and bid history queries to PostgreSQL read replicas (or Redis cache-aside with short TTL / write-through on commit). Beyond single-primary write throughput, shard `auctions` and `bids` by `auction_id` (e.g., Citus or application-level consistent hashing) so each shard handles a slice of the 50,000 live auctions independently.

### 5. Distributed Auction Closing Workers
- **MVP:** Single in-process `setInterval` worker running `FOR UPDATE SKIP LOCKED` every 1 second.
- **Production:** Run a pool of dedicated stateless **Closing Worker replicas** (outside the API processes). Each worker claims bounded batches (`LIMIT 200`) of expired auctions using `FOR UPDATE SKIP LOCKED` so workers never block each other or double-close. For 50,000 auctions with bursty simultaneous expirations, pair the DB sweep with a **Redis Sorted Set (`ZSET`)** delay queue (`score = ends_at_epoch`) so workers pop due auction IDs in `O(log N)` instead of repeatedly scanning the database, while keeping a periodic PostgreSQL sweep as a safety net for reconciliation.

### 6. Event Delivery, Reconnection, and Observability
- **MVP:** Monotonic `version` filtering on the client, automatic Socket.IO reconnection with REST state re-sync, and console logging.
- **Production:**
  - **Thundering-herd protection on reconnect:** Add randomized jitter + exponential backoff on client reconnects so a gateway restart doesn't slam the REST API with 200,000 simultaneous `GET /api/auctions/:id` requests; serve initial snapshots through CDN/Redis edge caching.
  - **Outbox pattern:** Write committed auction events to a transactional `outbox` table inside the same PostgreSQL transaction and relay them to Redis/Kafka so a process crash between `COMMIT` and `io.emit()` never drops a broadcast.
  - **Observability:** Instrument Prometheus/OpenTelemetry metrics for bid transaction latency (`p50/p95/p99`), PostgreSQL lock wait time, bid rejection reasons, closing worker lag (`closed_at - ends_at`), active WebSocket connections per room, and Redis adapter fan-out delay, with structured JSON logs and distributed trace IDs (`requestId`).
