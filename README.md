# AuctionMe — The Art of the Bid.

A full-stack, real-time online auction platform built with **Next.js (App Router)**, **React**, **Express.js**, **Socket.IO**, and **PostgreSQL**.

AuctionMe enforces strict transactional integrity for concurrent bidding using PostgreSQL row-level locks (`SELECT ... FOR UPDATE`), authoritative database-clock anti-sniping extensions (`+30 seconds` when `<= 30 seconds` remain), atomic single-winner closing (`FOR UPDATE SKIP LOCKED`), server-side session authentication with `scrypt` password hashing, and role-based access control (`BIDDER`, `HOST`, `ADMIN`).

---

## Table of Contents

- **Mandatory Assessment Deliverables**
  - [Deliverable 1 — System Design: Scaling to 50,000 Concurrent Auctions and 200,000 Viewers](#system-design-scaling-to-50000-concurrent-auctions-and-200000-viewers)
  - [Deliverable 2 — Working Project: Real-Time Auction Bidding Engine](#working-project-real-time-auction-bidding-engine)
  - [Verification and Assessment Evidence](#verification-and-assessment-evidence)
  - [Implementation Status](#implementation-status)
- **Full Project Documentation**
  1. [Project Introduction](#1-project-introduction)
2. [Features by Role](#2-features-by-role)
3. [Technology Stack](#3-technology-stack)
4. [System Architecture](#4-system-architecture)
5. [Project Structure](#5-project-structure)
6. [Prerequisites](#6-prerequisites)
7. [Installation and Setup](#7-installation-and-setup)
8. [Environment Variables](#8-environment-variables)
9. [Database Design](#9-database-design)
10. [Demo Accounts and Seed Data](#10-demo-accounts-and-seed-data)
11. [Auction Workflow & Concurrency Guarantees](#11-auction-workflow--concurrency-guarantees)
12. [API Documentation](#12-api-documentation)
13. [Real-Time Communication (Socket.IO)](#13-real-time-communication-socketio)
14. [Testing](#14-testing)
15. [Troubleshooting](#15-troubleshooting)
16. [Security Considerations](#16-security-considerations)
17. [Limitations and Future Improvements](#17-limitations-and-future-improvements)
18. [Team / Academic Information](#18-team--academic-information)
19. [License](#19-license)

---

## 1. Project Introduction

- **Project Name:** AuctionMe
- **Tagline:** *The Art of the Bid.*

### Problem Statement & Purpose
Online live auctions fail under concurrency when multiple bidders submit competing bids milliseconds apart, when last-second "sniping" prevents fair price discovery, or when naive polling/timers allow duplicate bids or conflicting winners at auction close.

### Core Objectives
1. **Transactional Correctness:** Serialize concurrent bids per auction inside PostgreSQL ACID transactions so lower or stale bids never overwrite higher accepted bids and duplicate retries never create duplicate records.
2. **Fair Anti-Sniping:** Automatically extend an auction's deadline by exactly 30 seconds whenever a valid bid commits with 30 seconds or less remaining, judged exclusively by PostgreSQL `clock_timestamp()`.
3. **Single-Winner Guarantee:** Close expired auctions atomically in a background worker using `FOR UPDATE SKIP LOCKED`, guaranteeing exactly one winner (or a clean no-bids close).
4. **Real-Time Synchronization:** Broadcast committed state changes and auction closures over Socket.IO rooms (`auction:<auctionId>`) with monotonic version numbers so clients ignore out-of-order/stale events.
5. **Role-Separated Platform:** Support `BIDDER`, `HOST`, and `ADMIN` workflows with backend-enforced RBAC.

### How Real-Time Bidding Works
The Next.js frontend loads initial authoritative state via Express REST APIs and joins the auction's Socket.IO room (`auction:<auctionId>`). When a bidder submits a bid, the request goes over REST (`POST /api/auctions/:id/bids`) with a unique `requestId` UUID. Express executes a PostgreSQL transaction; **only after `COMMIT` succeeds** does Express broadcast `auction:update` to every connected client in the room. Clients never simulate accepted bids optimistically.

---

## System Design: Scaling to 50,000 Concurrent Auctions and 200,000 Viewers

> **Scope Note:** This section is a **proposed production scalability architecture** explaining how AuctionMe can evolve to support 50,000 simultaneous auctions and up to 200,000 concurrent viewers watching a single hot auction. It is **not** a claim that the current local single-node PostgreSQL + Express + Socket.IO assessment implementation has been load-tested at 200,000 viewers.

### Architectural Pillars (6 Key Areas)

1. **Stateless Application Layer:**
   - Run multiple stateless Express REST API nodes behind an L7 load balancer (e.g., NGINX / AWS ALB / Cloudflare) so bidding and read APIs scale horizontally with zero local memory affinity.
   - **Already exists:** Server-side sessions are stored in PostgreSQL (`user_sessions` with SHA-256 hashed tokens) rather than process memory, so any backend node can validate a session cookie or `Bearer` token.
   - **To be added:** Multi-instance deployment behind a load balancer, a Redis session read-through cache to offload `user_sessions` lookups on every request, and automated horizontal autoscaling policies.

2. **Database Architecture:**
   - Keep **PostgreSQL** as the single authoritative system of record for `auctions`, `bids`, `users`, and final results, preserving strict ACID guarantees for financial state.
   - **Already exists:** Parameterized `pg.Pool` connection pooling (`max: 20`), `BIGINT` integer-paise monetary columns, `UNIQUE (auction_id, request_id)` idempotency constraint, and core indexes (`idx_auctions_status_ends_at`, `idx_bids_auction_created_at`, `idx_bids_bidder_created_at`).
   - **To be added:** External connection pooling via **PgBouncer** (transaction pooling mode) in front of PostgreSQL to multiplex thousands of app connections safely; **read replicas** for non-authoritative catalog browsing, leaderboards, and historical ledgers; partial indexes (`WHERE status = 'LIVE'`) for active auctions; and time/hash **partitioning or sharding by `auction_id`** only when measured write IOPS or table sizes justify the operational complexity.

3. **Real-Time Communication (200,000 Viewers on One Auction):**
   - Separate Socket.IO real-time gateway nodes from REST write nodes so tens of thousands of WebSocket connections do not starve HTTP bid transactions.
   - **Already exists:** Socket.IO room isolation (`auction:<auctionId>`), monotonic `version` payload filtering on the client, and automatic reconnect REST sync (`useAuctionSocket.js`).
   - **To be added:** Horizontally scaled Socket.IO edge clusters connected via a shared pub/sub backbone (`@socket.io/redis-streams-adapter` or Redis Cluster / NATS), sticky WebSocket routing at the load balancer, and hierarchical fan-out (gateway nodes subscribe once per hot `auction:<auctionId>` channel and fan out locally to thousands of sockets).

4. **Hot Auction Handling (Strict Serialization & Race Protection):**
   - Enforce a single authoritative ordering point per auction so simultaneous bids on a hot lot can never corrupt price progression or produce two conflicting winners.
   - **Already exists:** Per-auction row-level serialization via PostgreSQL `SELECT * FROM auctions WHERE id = $1 FOR UPDATE`, authoritative `clock_timestamp()` checks inside the lock, minimum-increment revalidation, and `(auction_id, request_id)` idempotency.
   - **To be added:** For extreme single-auction write contention (thousands of bids/sec on one row), introduce an auction-partitioned serialized ingress (e.g., Kafka/Redis Streams partitioned by `auction_id` or a per-auction single-writer coordinator) with pre-filtering of obviously stale bids before hitting PostgreSQL, plus a transactional outbox worker to guarantee every committed bid is published reliably to the pub/sub bus.

5. **High-Volume Viewer Delivery (Read/Broadcast Isolation):**
   - Decouple read-heavy viewer traffic from the transactional bid write path. A single hot auction with 200,000 viewers should generate at most one cached snapshot read per interval and compact incremental broadcast diffs—never 200,000 database queries.
   - **Already exists:** Compact JSON `auction:update` payloads, client-side monotonic `version` deduplication, and reconnect REST fetch (`GET /api/auctions/:id`).
   - **To be added:** Redis/CDN caching of read-heavy auction metadata and static catalog pages; micro-batched or throttled broadcast coalescing (e.g., emitting the latest committed highest bid every 100–250 ms during bid storms while preserving every accepted bid in PostgreSQL); randomized reconnect jitter to prevent thundering herds after a node restart; and per-socket send-buffer backpressure handling (dropping intermediate frames and forcing a snapshot resync for slow clients).

6. **Reliability, Rate Limiting & Observability:**
   - Protect the authoritative write path with edge and per-user/per-IP rate limiting, graceful shutdown draining, and automated failover.
   - **Already exists:** Graceful `SIGINT`/`SIGTERM` shutdown (`server.js`), idempotent `FOR UPDATE SKIP LOCKED` closing worker (`closingService.js`) that is safe across multiple worker instances, and structured `AppError` codes.
   - **To be added:** Distributed rate limiting (Redis token bucket on `/api/auth/*` and `POST /api/auctions/:id/bids`), dead-letter queueing for notification/audit side effects, PostgreSQL synchronous/streaming standby with automated failover (Patroni / managed RDS Multi-AZ), Prometheus/OpenTelemetry metrics (lock wait time, transaction p99 latency, Socket.IO room fan-out lag, closing worker drift), and formal k6/Artillery load testing before claiming any throughput or viewer-count SLA.

### Consistency, Latency & Throughput Trade-Offs
- **Bid Write Path (Strong Consistency over Raw Throughput):** Bidding uses strict ACID serialization (`SELECT ... FOR UPDATE` + `COMMIT` before broadcast). This trades slightly higher per-bid tail latency under heavy contention on a single lot for **zero double-winners, zero lost increments, and zero phantom broadcasts**.
- **Viewer Broadcast Path (Low Latency & High Fan-Out with Eventual Snapshots):** Viewers tolerate ~100–300 ms display latency during extreme bursts; coalescing rapid updates and serving catalog metadata from cache/read replicas dramatically increases viewer throughput without weakening the authoritative bid ledger.

### Proposed Scalable Architecture Diagram

```mermaid
flowchart LR
    subgraph Clients["Clients (Up to 200,000 Viewers + Active Bidders)"]
        B["Active Bidders<br/>(Authoritative Writes)"]
        V["Read-Only Viewers<br/>(Live Room & Catalog)"]
    end

    LB["L7 Load Balancer<br/>(TLS, Rate Limiting, Sticky WS)"]

    subgraph WritePath["Authoritative Write Tier (Stateless REST)"]
        API1["Express API Node 1"]
        API2["Express API Node N"]
    end

    subgraph RealtimeTier["Horizontally Scaled Socket.IO Tier"]
        WS1["Socket.IO Gateway 1<br/>(room: auction:id)"]
        WS2["Socket.IO Gateway M<br/>(room: auction:id)"]
    end

    subgraph Workers["Background Workers"]
        CW["Closing Worker Pool<br/>(FOR UPDATE SKIP LOCKED)"]
    end

    subgraph DataLayer["Data & Pub/Sub Backbone"]
        PGB["PgBouncer Pool"]
        PG_P[("PostgreSQL Primary<br/>(Authoritative ACID Ledger)")]
        PG_R[("PostgreSQL Read Replicas<br/>(Catalog / History Reads)")]
        REDIS[("Redis Pub/Sub & Cache<br/>(Socket.IO Adapter + Snapshots)")]
    end

    B -- "POST /api/auctions/:id/bids<br/>(Authoritative Write Path)" --> LB
    V -- "WebSocket / GET Catalog<br/>(Read-Only Viewer Path)" --> LB

    LB --> API1 & API2
    LB --> WS1 & WS2

    API1 & API2 -- "SELECT ... FOR UPDATE + COMMIT" --> PGB --> PG_P
    API1 & API2 -. "Read-only catalog / history" .-> PG_R
    PG_P -. "Streaming Replication" .-> PG_R

    API1 & API2 -- "Post-Commit Publish" --> REDIS
    CW -- "Atomic Close + Winner" --> PGB
    CW -- "Post-Commit auction:closed" --> REDIS

    REDIS -- "Cross-Instance Fan-Out" --> WS1 & WS2
    WS1 & WS2 -- "auction:update / auction:closed" --> V
    WS1 & WS2 -- "bid:rejected / auction:update" --> B
```

---

## Working Project: Real-Time Auction Bidding Engine

This section documents the **actual implemented and verified bidding engine** in [backend/src/services/biddingService.js](backend/src/services/biddingService.js), [backend/src/services/closingService.js](backend/src/services/closingService.js), [backend/src/routes/auctions.js](backend/src/routes/auctions.js), and [backend/src/sockets/auctionSocket.js](backend/src/sockets/auctionSocket.js).

### A. Bid Acceptance and Rejection
- **Backend-Only Authority:** The frontend never marks a bid as accepted locally. Every bid is sent via `POST /api/auctions/:id/bids` with `{ amount, requestId, socketId }` and an authenticated `BIDDER` session (`requireAuth`, `requireRole('BIDDER')`). The server derives `bidderId` strictly from `req.user.auctionMeId`—any client-supplied `bidderId` is ignored.
- **Validation Pipeline (inside PostgreSQL transaction):**
  1. Payload validation: valid UUIDs (`auctionId`, `requestId`), positive safe integer `amount` in paise (`400 INVALID_BID_AMOUNT` / `INVALID_REQUEST_ID`).
  2. Auction existence (`404 AUCTION_NOT_FOUND`), moderation check (`409 AUCTION_SUSPENDED`), and self-bidding protection (`403 HOST_CANNOT_BID_OWN_AUCTION`).
  3. Idempotency lookup on `(auction_id, request_id)` — returns the original accepted bid (`200 OK`, `idempotentReplay: true`) without creating duplicates.
  4. Authoritative status & PostgreSQL `clock_timestamp()` time window check: rejects `SCHEDULED` / pre-start (`409 AUCTION_NOT_STARTED`), `CLOSED` (`409 AUCTION_CLOSED`), or expired (`409 AUCTION_EXPIRED`).
  5. Minimum increment check: enforces `amount >= current_price + min_increment`; otherwise rolls back and returns `409 BID_TOO_LOW` with `{ currentPrice, minIncrement, minNextBid, version }`.
  6. On rejection, the transaction executes `ROLLBACK`, leaving auction price, bid history, and `ends_at` completely untouched, and optionally emits `bid:rejected` only to the submitting `socketId`.

### B. Anti-Sniping: 30-Second Extension
- **Atomic Evaluation & Update:** Inside the same `SELECT ... FOR UPDATE` transaction, PostgreSQL computes `should_extend = ((ends_at - clock_timestamp()) <= INTERVAL '30 seconds')` using database time (never browser or Node.js clock).
- **Atomic Extension:** When `should_extend` is true for a **valid** bid, the `UPDATE auctions` statement atomically sets `ends_at = ends_at + INTERVAL '30 seconds'` alongside `current_price`, `highest_bidder_id`, and `version = version + 1`.
- **Viewer Timer Synchronization:** Every REST response and post-commit `auction:update` Socket.IO event carries `{ auction.endsAt, extended, extensionSeconds, serverTime, version }`. Connected clients compute `serverOffsetMs = Date.parse(serverTime) - Date.now()` and render countdowns relative to authoritative server time.
- **Verified Edge Cases:** Bids with `> 30s` remaining do **not** extend `ends_at`; rejected bids inside the final 30 seconds do **not** extend `ends_at`; expired bids (`clock_timestamp() >= ends_at`) are rejected without extending `ends_at` (all verified in `concurrency-test.js`).

### C. Concurrent Bidding Correctness
- **Row-Level Serialization (`SELECT ... FOR UPDATE`):** Every `placeBid()` call opens a PostgreSQL transaction (`BEGIN`) and locks the target auction row via `SELECT * FROM auctions WHERE id = $1 FOR UPDATE`. Concurrent transactions targeting the same auction block until the lock holder commits or rolls back.
- **Rechecking Inside the Transaction:** After acquiring the lock, `current_price`, `status`, and `ends_at` are read from the freshly locked row and compared against `clock_timestamp()`. Consequently, if 5 bidders submit the exact same valid amount simultaneously, only the first transaction to acquire the lock succeeds (`201 Created`); the remaining 4 see the updated `current_price` and are cleanly rejected with `409 BID_TOO_LOW`.
- **Idempotency via `request_id`:** Every bid carries a client-generated UUID `requestId`. The `bids` table enforces `CONSTRAINT bids_auction_request_unique UNIQUE (auction_id, request_id)`. Both an in-transaction lookup and a `23505` unique-violation fallback guarantee that network retries or concurrent duplicate submissions return the original accepted bid (`200 OK`, `idempotentReplay: true`) without double-charging, double-inserting, or re-broadcasting.

### D. Exactly One Winner
- **Expired Auction Detection:** The background closing worker ([closingWorker.js](backend/src/workers/closingWorker.js) → [closingService.js](backend/src/services/closingService.js)) polls PostgreSQL on an interval (`CLOSING_WORKER_INTERVAL_MS=1000`) using `SELECT id FROM auctions WHERE status = 'LIVE' AND ends_at <= clock_timestamp() FOR UPDATE SKIP LOCKED`.
- **Safe Interoperability with Active Bids:** Because `SKIP LOCKED` skips rows currently locked by an in-flight bid transaction, a photo-finish bid inside the last second either commits and extends `ends_at` by `+30s` (causing the worker to re-check `ends_at <= clock_timestamp()` and skip closure) or loses the lock race and is rejected with `409`.
- **Atomic Closure & Winner Storage:** For each locked expired auction, PostgreSQL executes an atomic `UPDATE auctions SET status = 'CLOSED', winner_id = highest_bidder_id, closed_at = clock_timestamp(), version = version + 1 WHERE id = $1 AND status = 'LIVE' AND ends_at <= clock_timestamp()`.
- **No-Bids & Idempotent Re-Runs:** If no bids were accepted, `highest_bidder_id` is `NULL`, so the auction closes cleanly with `winner_id = NULL` and `hadBids = false`. Because the `UPDATE` requires `status = 'LIVE'`, concurrent or repeated closing worker runs are strictly idempotent and never alter `winner_id` or `version` after close. Only after `COMMIT` succeeds does the worker emit `auction:closed` to `auction:<auctionId>`.

### Bidding Flow Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Bidder
    participant API as Express API<br/>(POST /api/auctions/:id/bids)
    participant Engine as Bidding Service<br/>(biddingService.js)
    participant PG as PostgreSQL<br/>(ACID + Row Lock)
    participant SIO as Socket.IO Server
    actor Viewers as Connected Viewers<br/>(room: auction:id)

    Bidder->>API: POST bid { amount, requestId, socketId } + session cookie/token
    API->>API: requireAuth + requireRole('BIDDER')<br/>bidderId = req.user.auctionMeId
    API->>Engine: placeBid({ auctionId, bidderId, amount, requestId })
    Engine->>PG: BEGIN
    Engine->>PG: SELECT * FROM auctions WHERE id = $1 FOR UPDATE
    Engine->>PG: SELECT clock_timestamp() & time window checks
    Engine->>PG: Check (auction_id, request_id) idempotency

    alt Invalid / Expired / Below Min Increment
        Engine->>PG: ROLLBACK
        Engine-->>API: Throw AppError (400 / 403 / 409)
        API->>SIO: emit('bid:rejected') to submitting socketId
        API-->>Bidder: 4xx JSON error
    else Duplicate requestId (Idempotent Replay)
        Engine->>PG: COMMIT
        Engine-->>API: { idempotentReplay: true, bid, auction }
        API-->>Bidder: 200 OK (no duplicate DB row, no rebroadcast)
    else Valid New Bid
        Engine->>PG: INSERT INTO bids (auction_id, bidder_id, amount, request_id)
        Engine->>PG: UPDATE auctions SET current_price, highest_bidder_id,<br/>version = version + 1, ends_at (+30s if <=30s left)
        Engine->>PG: COMMIT
        Engine-->>API: { idempotentReplay: false, extended, bid, auction }
        API->>SIO: Post-Commit broadcast('auction:update')
        SIO-->>Viewers: auction:update { auction, bid, version, extended, serverTime }
        API-->>Bidder: 201 Created { accepted: true, bid, auction }
    end
```

### Auction Closing Flow Diagram

```mermaid
sequenceDiagram
    autonumber
    participant Worker as Closing Worker<br/>(closingWorker.js)
    participant Service as Closing Service<br/>(closingService.js)
    participant PG as PostgreSQL
    participant SIO as Socket.IO Server
    actor Viewers as Connected Viewers

    loop Every CLOSING_WORKER_INTERVAL_MS (1000ms)
        Worker->>Service: closeExpiredAuctions(io)
        Service->>PG: BEGIN
        Service->>PG: SELECT id FROM auctions<br/>WHERE status = 'LIVE' AND ends_at <= clock_timestamp()<br/>FOR UPDATE SKIP LOCKED
        alt Expired Auction(s) Found
            Service->>PG: UPDATE auctions SET status = 'CLOSED',<br/>winner_id = highest_bidder_id,<br/>closed_at = clock_timestamp(), version = version + 1<br/>WHERE id = $1 AND status = 'LIVE' AND ends_at <= clock_timestamp()
            Service->>PG: SELECT COUNT(*) FROM bids WHERE auction_id = $1
            Service->>PG: COMMIT
            Service->>SIO: Post-Commit emit('auction:closed')<br/>{ winnerId (or null), finalPrice, hadBids, version }
            SIO-->>Viewers: auction:closed
        else No Expired Unlocked Auctions
            Service->>PG: COMMIT (no-op)
        end
    end
```

---

## Verification and Assessment Evidence

All tests below were **actually executed** against the live PostgreSQL database (`live_auction`) and Express + Socket.IO server via:
- `cd backend && npm run test:concurrency` ([backend/scripts/concurrency-test.js](backend/scripts/concurrency-test.js)) — **14 / 14 passed**
- `cd backend && npm run test:persistence` ([backend/scripts/verify-persistence-and-roles.js](backend/scripts/verify-persistence-and-roles.js)) — **6 / 6 passed**
- `cd backend && npm run test:api` ([backend/scripts/verify-api.js](backend/scripts/verify-api.js)) — **10 / 10 passed**

> **Honesty Note:** These suites verify transactional correctness, concurrency safety, RBAC, restart persistence, and two-session Socket.IO synchronization. They are **not** 200,000-viewer load tests.

| # | Required Assessment Test Case | Implemented | Executed | Result | Actual Test / Verification Evidence |
|---|---|---|---|---|---|
| 1 | Valid bid accepted | Yes | Yes | **PASS** | `concurrency-test.js` (Tests 1, 2, 9, 10, 12) & `verify-persistence-and-roles.js` (Test 8): returns `201 Created`, inserts DB row, updates `current_price`, `highest_bidder_id`, and `version`. |
| 2 | Invalid bid rejected | Yes | Yes | **PASS** | `concurrency-test.js` (Test 5): `0`, `-50000`, `1050000.5`, `'1050000'`, and `null` all rejected with `400 INVALID_BID_AMOUNT` and `0` rows inserted. |
| 3 | Bid below minimum increment rejected | Yes | Yes | **PASS** | `concurrency-test.js` (Tests 3 & 4): bid below `current_price + min_increment` (`1049999`) and bid equal to `current_price` (`1000000`) rejected with `409 BID_TOO_LOW`; price and `ends_at` unchanged. |
| 4 | Duplicate request ID handled idempotently | Yes | Yes | **PASS** | `concurrency-test.js` (Test 6): 4 concurrent identical `requestId` calls returned `1 × 201 Created` + `3 × 200 OK (idempotentReplay: true)` with `1` DB row; sequential retry after higher bid returned original bid ID. |
| 5 | Bid arriving within last 30s extends auction by 30s | Yes | Yes | **PASS** | `concurrency-test.js` (Tests 9, 10, 11): bid with `15s` remaining extended `ends_at` by exact `+30000ms` (`extended: true`); bid with `32s` remaining and rejected bid at `10s` did not extend. |
| 6 | Simultaneous bids do not corrupt price or history | Yes | Yes | **PASS** | `concurrency-test.js` (Tests 1 & 2): 5 simultaneous identical bids produced exactly `1` accepted, `4` rejected (`409`), `1` DB row, `version = 2`; 4 competing ascending bids settled on `1200000` (`racer-3`). |
| 7 | Expired auctions reject new bids | Yes | Yes | **PASS** | `concurrency-test.js` (Test 8): bid after `ends_at` rejected with `409 AUCTION_EXPIRED` without extending deadline. |
| 8 | Auction closing determines exactly one winner | Yes | Yes | **PASS** | `concurrency-test.js` (Tests 12 & 14): 5 concurrent `closeExpiredAuctions` runs closed the auction exactly once (`winner_id = 'winning-user-99'`); repeat run did not alter winner or `version`; bid-vs-close race resolved atomically. |
| 9 | Auction with no accepted bids closes without a winner | Yes | Yes | **PASS** | `concurrency-test.js` (Test 13): expired auction with 0 bids closed with `status = 'CLOSED'`, `winnerId = null`, `hadBids = false`, `closedAt` populated. |
| 10 | Socket.IO broadcasts only committed auction updates | Yes | Yes | **PASS** | `verify-persistence-and-roles.js` (Tests 8 & 9): two independent Socket.IO sessions in the same room simultaneously received `auction:update` with the exact committed `bid.id`, `currentPrice`, and `version`, and the bid survived a full backend process kill & restart. |

---

## Implementation Status

| Capability / Component | Category | Architecture Scope | Notes |
|---|---|---|---|
| Transactional bidding (`SELECT ... FOR UPDATE`, idempotency, min increment, `+30s` anti-sniping) | **Implemented and tested** | Current Assessment Architecture (PostgreSQL + Express) | Verified by `npm run test:concurrency` (14/14). |
| Atomic single-winner closing worker (`FOR UPDATE SKIP LOCKED`) | **Implemented and tested** | Current Assessment Architecture | Verified by `npm run test:concurrency` (Tests 12–14). |
| Persistent PostgreSQL schema, auto-create DB, idempotent demo seed & 3-role RBAC (`demo_bidder`, `demo_host`, `demo_admin`) | **Implemented and tested** | Current Assessment Architecture | Verified by `npm run db:init`, double `npm run db:seed`, `npm run test:api` (10/10), and `npm run test:persistence` (6/6). |
| Post-commit Socket.IO room updates, version filtering & backend restart persistence | **Implemented and tested** | Current Assessment Architecture | Verified across 2 independent Socket.IO sessions & full backend restart (`npm run test:persistence`). |
| Host & Admin REST APIs (`/api/host/*`, `/api/admin/*`, complaints, audit logs) & Notifications API (`/api/me/notifications`) | **Implemented but not load-tested** | Current Assessment Architecture | Functional and RBAC-verified; no stress/load benchmark executed. |
| Next.js Frontend (Login, Signup, Discover, Live Room, Result, Ledger, Holdings, Watchlist) | **Implemented but not load-tested** | Current Assessment Architecture | Production build verified (`npm run build`, 15/15 pages). |
| Multi-node stateless API + Load Balancer + `@socket.io/redis-streams-adapter` + PgBouncer + Read Replicas + Partitioning | **Proposed future scalability work** | Proposed Distributed Production Architecture | Documented in Deliverable 1 above; not deployed in local repo. |
| Dedicated Host/Admin Frontend Dashboards, HTTP rate limiting, CSRF token middleware, password recovery & k6 load tests | **Not implemented** | Future Product & Production Hardening | Tracked in Sections 16 & 17 below. |

---

## 2. Features by Role

> **Legend:** **Implemented** = code exists and is verified; **Backend Implemented / UI Planned** = API exists, dedicated frontend screens not yet built; **Designed / Not Implemented** = planned only.

### Bidder
| Feature | Status | Details |
|---|---|---|
| Registration & Login (AuctionMe ID + Password) | **Implemented** (Backend + UI) | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/check-id`; `/login`, `/signup` *(Note: `/signup` UI still needs final wiring to `POST /api/auth/register`)* |
| Discover & Browse Auctions | **Implemented** | `/discover`, `/auctions`, `GET /api/auctions` |
| Participate in Live Bidding | **Implemented** | `/`, `/auctions/[id]`, `POST /api/auctions/:id/bids`, real-time Socket.IO room updates & `+30s` anti-sniping |
| View Bid History (My Ledger) | **Implemented** (Backend + UI) | `GET /api/me/bids`; `/ledger` *(Note: `/ledger` UI needs final wiring to `GET /api/me/bids`; rejected bids are not persisted in DB)* |
| View Auction Results & Winner Details | **Implemented** | `/result`, `/auctions/[id]/result`, `GET /api/auctions/:id/result` |
| Manage Watchlist | **Implemented** | `/watchlist`, `GET/POST/DELETE /api/me/watchlist` |
| View Won Auctions (My Holdings) | **Implemented** | `/holdings`, `GET /api/me/holdings` |
| Notifications Center | **UI Implemented / Backend Missing** | `/notifications` screen built; no backend notifications API yet |
| Profile & Settings | **UI Implemented / Backend Partial** | `/settings` (theme & local preferences work; profile edit & password change APIs not implemented) |

### Host
| Feature | Status | Details |
|---|---|---|
| Create Auctions | **Backend Implemented / UI Planned** | `POST /api/host/auctions` |
| List, View & Edit Own Auctions | **Backend Implemented / UI Planned** | `GET /api/host/auctions`, `GET /api/host/auctions/:id`, `PATCH /api/host/auctions/:id` |
| Start & Manually Close Auctions | **Backend Implemented / UI Planned** | `POST /api/host/auctions/:id/start`, `POST /api/host/auctions/:id/close` |
| Monitor Live Auctions & View Results | **Implemented via Shared Routes** | `GET /api/auctions/:id`, `GET /api/auctions/:id/bids`, `GET /api/auctions/:id/result` |
| Dedicated Host Dashboard UI (H01–H05) | **Designed / Not Implemented** | Planned frontend screens |

### Administrator
| Feature | Status | Details |
|---|---|---|
| User & Role Management | **Backend Implemented / UI Planned** | `GET /api/admin/users`, `PATCH /api/admin/users/:id/role`, `PATCH /api/admin/users/:id/status` |
| Auction Moderation (`APPROVED`, `FLAGGED`, `SUSPENDED`) | **Backend Implemented / UI Planned** | `GET /api/admin/auctions`, `PATCH /api/admin/auctions/:id/moderate` |
| Audit Logs | **Backend Implemented / UI Planned** | `GET /api/admin/audit-logs` |
| Platform Overview Dashboard & Complaints/Disputes | **Designed / Not Implemented** | Not yet implemented on backend or frontend |

---

## 3. Technology Stack

Documented directly from [backend/package.json](backend/package.json) and [frontend/package.json](frontend/package.json):

| Layer | Technology | Version / Package |
|---|---|---|
| **Frontend Framework** | Next.js (App Router) + React | `next ^15.1.7`, `react ^18.3.1`, `react-dom ^18.3.1` |
| **Styling & Typography** | Tailwind CSS + PostCSS + Google Fonts (`Playfair Display`, `Inter`) | `tailwindcss ^3.4.17`, `autoprefixer ^10.4.20`, `postcss ^8.4.49` |
| **Backend Runtime & API** | Node.js + Express.js | Node.js 20+ (verified on v22.23.2), `express ^4.21.2`, `cors ^2.8.5`, `dotenv ^16.4.7` |
| **Database & Driver** | PostgreSQL + `node-postgres` | PostgreSQL 16+ (Docker `postgres:16-alpine` or local PG 18), `pg ^8.13.1` |
| **Real-Time Transport** | Socket.IO | `socket.io ^4.8.1` (server), `socket.io-client ^4.8.1` (client) |
| **Auth & Password Hashing** | Node.js built-in `crypto` | `scryptSync` + 16-byte random salt + `timingSafeEqual`; opaque SHA-256 hashed session tokens in `HttpOnly` cookie (`auctionme_session`) & `Bearer` header |
| **Testing** | Node.js built-in `assert` + native `fetch` | `backend/scripts/concurrency-test.js`, `backend/scripts/verify-api.js` |
| **Infrastructure** | Docker Compose | `docker-compose.yml` (`postgres:16-alpine`) |

---

## 4. System Architecture

```mermaid
flowchart LR
    subgraph Clients
        B["Bidder Browser<br/>(Next.js UI)"]
        H["Host Client<br/>(REST / Planned UI)"]
        A["Admin Client<br/>(REST / Planned UI)"]
    end

    subgraph Frontend["Next.js Frontend (:3000)"]
        UI["App Router Pages & Components<br/>(Light / Dark / System Themes)"]
        SIO_C["Socket.IO Client Hook<br/>(Version Filtering + Reconnect Sync)"]
    end

    subgraph Backend["Express + Socket.IO Server (:4000)"]
        MW["Auth & RBAC Middleware<br/>(attachUser, requireAuth, requireRole)"]
        ROUTES["REST Routers<br/>/auth, /me, /host, /admin, /auctions"]
        BID_SVC["Transactional Bidding Service<br/>(SELECT FOR UPDATE + Anti-Sniping)"]
        CLOSE_W["Auction Closing Worker<br/>(1s interval · FOR UPDATE SKIP LOCKED)"]
        SIO_S["Socket.IO Server<br/>Rooms: auction:&lt;id&gt;"]
    end

    subgraph Database["PostgreSQL (:5432)"]
        PG[("users · user_sessions<br/>auctions · bids<br/>watchlist · audit_logs")]
    end

    B --> UI
    UI -->|REST API| MW
    H -->|REST API| MW
    A -->|REST API| MW
    SIO_C <-->|WebSocket / Polling| SIO_S

    MW --> ROUTES
    ROUTES --> BID_SVC
    BID_SVC -->|ACID TX + clock_timestamp| PG
    BID_SVC -.->|Post-Commit Emit| SIO_S
    CLOSE_W -->|ACID TX + SKIP LOCKED| PG
    CLOSE_W -.->|Post-Commit Emit| SIO_S
    ROUTES -->|Parameterized SQL| PG
```

### Component Responsibilities
- **Next.js Frontend (`frontend/`):** Dedicated presentation tier (zero Next.js API routes). Fetches authoritative initial state over REST, synchronizes countdowns against server timestamps, and applies post-commit Socket.IO updates only when `event.version > currentVersion`.
- **Express Backend (`backend/`):** Single authoritative API and WebSocket server. Enforces input validation, session verification, role-based access control, and centralized error handling.
- **Transactional Bidding Service (`backend/src/services/biddingService.js`):** Serializes competing bids per auction via PostgreSQL row locks, checks idempotency (`request_id`), validates minimum increments, and applies 30-second anti-sniping extensions atomically.
- **Auction Closing Worker (`backend/src/workers/closingWorker.js` & `closingService.js`):** Runs every `1000ms` (configurable) to lock and close expired `LIVE` auctions atomically without interfering with active bidding transactions.
- **PostgreSQL Database:** Authoritative source of truth for users, sessions, auctions, bids, watchlist entries, audit logs, and `clock_timestamp()`.

---

## 5. Project Structure

```text
.
├── docker-compose.yml                  # PostgreSQL 16 service definition
├── .env.example                        # Safe template for environment variables
├── .gitignore
├── README.md
├── backend/
│   ├── package.json
│   ├── scripts/
│   │   ├── init-db.js                  # Applies backend/src/database/schema.sql
│   │   ├── seed.js                     # Seeds demo users, live demo auction & initial bids
│   │   ├── concurrency-test.js         # 14-case concurrency, anti-sniping & closing test suite
│   │   └── verify-api.js               # 10-case Auth, RBAC, Host, Bidder & Admin API test suite
│   └── src/
│       ├── app.js                      # Express app setup, CORS, routes, error handler
│       ├── server.js                   # HTTP + Socket.IO server & closing worker startup
│       ├── config/
│       │   ├── db.js                   # pg connection pool
│       │   └── env.js                  # Environment variable loader
│       ├── database/
│       │   ├── schema.sql              # Idempotent PostgreSQL DDL & indexes
│       │   └── init.js                 # Schema runner
│       ├── middleware/
│       │   └── auth.js                 # Cookie/Bearer extraction, attachUser, requireAuth, requireRole
│       ├── routes/
│       │   ├── auctions.js             # Public auction read & transactional bid routes
│       │   ├── auth.js                 # Register, login, logout, check-id, me
│       │   ├── me.js                   # Authenticated bidder bids, holdings & watchlist
│       │   ├── host.js                 # Host/Admin auction lifecycle management
│       │   └── admin.js                # Admin user, moderation & audit log routes
│       ├── services/
│       │   ├── auctionService.js       # Auction list, detail, bids & result queries
│       │   ├── authService.js          # scrypt password hashing & opaque DB sessions
│       │   ├── bidderService.js        # Bidder ledger, holdings & watchlist queries
│       │   ├── biddingService.js       # Core ACID bidding engine + anti-sniping
│       │   ├── closingService.js       # Atomic FOR UPDATE SKIP LOCKED closing logic
│       │   ├── hostService.js          # Host auction CRUD, start & close
│       │   ├── adminService.js         # User management, moderation & audit logging
│       │   └── helpers.js              # AppError, UUID validation & response formatters
│       ├── sockets/
│       │   └── auctionSocket.js        # Socket.IO room join/leave & post-commit emitters
│       └── workers/
│           └── closingWorker.js        # Periodic expired-auction closing loop
└── frontend/
    ├── package.json
    ├── next.config.mjs
    ├── tailwind.config.js              # AuctionMe design tokens & darkMode: 'class'
    ├── postcss.config.mjs
    ├── public/images/                  # Dark chronograph & light gavel hero artwork
    └── src/
        ├── app/                        # Next.js App Router pages
        │   ├── page.js                 # Live Auction Room
        │   ├── discover/page.js        # Auction Catalog
        │   ├── auctions/page.js        # Auction Catalog alias
        │   ├── auctions/[id]/page.js   # Specific Live Auction Room
        │   ├── auctions/[id]/result/page.js # Auction Result / Winner Details (Screen 05)
        │   ├── result/page.js          # Result shortcut route
        │   ├── login/page.js           # Screen 01 — Login
        │   ├── signup/page.js          # Screen 02 — Sign Up
        │   ├── ledger/page.js          # Screen 06 — My Ledger
        │   ├── holdings/page.js        # Screen 07 — My Holdings
        │   ├── watchlist/page.js       # Screen 08 — Watchlist
        │   ├── notifications/page.js   # Screen 09 — Notifications
        │   └── settings/page.js        # Screen 10 — Profile & Settings
        ├── components/                 # Modular UI components grouped by domain
        ├── hooks/                      # useAuctionSocket, useCatalogSocket, useThemePreference
        ├── services/                   # api.js, authApi.js
        └── utils/                      # formatters.js, authValidation.js, ledgerUtils.js
```

---

## 6. Prerequisites

- **Node.js:** v20.x or newer (verified with `v22.23.2`)
- **npm:** v10.x or newer (verified with `10.9.8`)
- **PostgreSQL:** 16+ (via Docker Compose `postgres:16-alpine` **or** a local PostgreSQL installation)
- **Git:** For cloning and version control
- **Docker Desktop (optional):** Required only if running PostgreSQL via `docker compose`

---

## 7. Installation and Setup

### 1. Clone Repository
```bash
git clone <your-repository-url>
cd Tech_Ahir_Internship_R2_Submission
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
cd ..
```

### 3. Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### 4. Start / Create PostgreSQL Database

**Option A — Docker Compose (recommended when Docker Desktop is running):**
```bash
docker compose up -d postgres
```

**Option B — Local PostgreSQL instance:**
Create a role and database matching your `DATABASE_URL` (for example, database `live_auction` owned by your local role).

### 5. Configure Environment Files
Copy `.env.example` to `backend/.env` and `frontend/.env.local`, replacing placeholder credentials with your local values:
```bash
cp .env.example backend/.env
```
Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

### 6. Initialize Database Schema
```bash
cd backend
npm run db:init
```

### 7. Seed Demo Data
```bash
npm run db:seed
```

### 8. Start Backend Server (Terminal 1)
```bash
cd backend
npm run dev
# Or for production mode:
npm start
```
Express API + Socket.IO starts on `http://localhost:4000`.

### 9. Start Frontend Application (Terminal 2)
```bash
cd frontend
npm run dev
# Or production build + start:
npm run build
npm start
```
Next.js starts on `http://localhost:3000`.

### 10. Open in Browser
- **Live Auction Room:** `http://localhost:3000`
- **Discover / Catalog:** `http://localhost:3000/discover`
- **Login (Screen 01):** `http://localhost:3000/login`
- **Sign Up (Screen 02):** `http://localhost:3000/signup`
- **Auction Result (Screen 05):** `http://localhost:3000/result`
- **My Ledger (Screen 06):** `http://localhost:3000/ledger`
- **My Holdings (Screen 07):** `http://localhost:3000/holdings`
- **Watchlist (Screen 08):** `http://localhost:3000/watchlist`
- **Notifications (Screen 09):** `http://localhost:3000/notifications`
- **Profile & Settings (Screen 10):** `http://localhost:3000/settings`

---

## 8. Environment Variables

Never commit `.env` or `frontend/.env.local` to version control (both are listed in `.gitignore`). Use `.env.example` with non-secret placeholders only.

| Variable | Purpose | Example Placeholder | Required |
|---|---|---|---|
| `POSTGRES_USER` | PostgreSQL username for Docker Compose | `<db_user>` | Optional (default `auction_user`) |
| `POSTGRES_PASSWORD` | PostgreSQL password for Docker Compose | `<db_password>` | Optional (default in compose for local dev) |
| `POSTGRES_DB` | PostgreSQL database name | `live_auction` | Optional (default `live_auction`) |
| `POSTGRES_PORT` | Host port mapped to PostgreSQL | `5432` | Optional (default `5432`) |
| `DATABASE_URL` | Full PostgreSQL connection string used by `pg` | `postgresql://<db_user>:<db_password>@localhost:5432/live_auction` | **Required** (or individual `POSTGRES_*` vars) |
| `PORT` | Express HTTP + Socket.IO server port | `4000` | Optional (default `4000`) |
| `NODE_ENV` | Runtime mode (`development` or `production`; controls `Secure` cookie flag) | `development` | Optional (default `development`) |
| `CORS_ORIGIN` | Comma-separated allowed frontend origins | `http://localhost:3000` | Optional (default `http://localhost:3000`) |
| `CLOSING_WORKER_INTERVAL_MS` | Polling interval (ms) for expired-auction closing worker | `1000` | Optional (default `1000`) |
| `DEMO_PASSWORD` | Assessment password for local `npm run db:seed` demo accounts (never printed in production) | `AuctionMe@2025` | Optional in dev; required if seeding in production |
| `NEXT_PUBLIC_API_URL` | Express REST API base URL for Next.js | `http://localhost:4000` | **Required** (frontend) |
| `NEXT_PUBLIC_SOCKET_URL` | Express Socket.IO server URL for Next.js | `http://localhost:4000` | **Required** (frontend) |

---

## 9. Database Design

Defined in [backend/src/database/schema.sql](backend/src/database/schema.sql). All monetary values are stored in **integer paise** (`BIGINT`, where `100 paise = ₹1.00`) to prevent floating-point drift.

```mermaid
erDiagram
    USERS ||--o{ USER_SESSIONS : "has sessions"
    USERS ||--o{ AUCTIONS : "hosts (host_user_id)"
    USERS ||--o{ WATCHLIST : "watches"
    USERS ||--o{ AUDIT_LOGS : "performs (actor_user_id)"
    AUCTIONS ||--o{ BIDS : "receives"
    AUCTIONS ||--o{ WATCHLIST : "watched in"

    USERS {
        uuid id PK
        varchar auction_me_id UK
        varchar display_name
        text password_hash
        varchar role "BIDDER | HOST | ADMIN"
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    USER_SESSIONS {
        uuid id PK
        uuid user_id FK
        char token_hash UK "SHA-256 hex"
        timestamptz expires_at
        timestamptz created_at
    }

    AUCTIONS {
        uuid id PK
        text title
        text description
        varchar status "SCHEDULED | LIVE | CLOSED"
        bigint starting_price "paise"
        bigint current_price "paise"
        bigint min_increment "paise"
        text highest_bidder_id
        text winner_id
        timestamptz starts_at
        timestamptz ends_at
        timestamptz closed_at
        bigint version
        uuid host_user_id FK
        varchar category
        text image_url
        varchar moderation_status "APPROVED | FLAGGED | SUSPENDED"
        text moderation_note
    }

    BIDS {
        uuid id PK
        uuid auction_id FK
        text bidder_id
        bigint amount "paise"
        uuid request_id "UNIQUE(auction_id, request_id)"
        timestamptz created_at
    }

    WATCHLIST {
        uuid user_id PK, FK
        uuid auction_id PK, FK
        timestamptz created_at
    }

    AUDIT_LOGS {
        uuid id PK
        uuid actor_user_id FK
        varchar action
        varchar target_type
        text target_id
        jsonb details
        timestamptz created_at
    }
```

### Key Schema Design Decisions
- **User & Role Relationships:** `users.role` is constrained via `CHECK (role IN ('BIDDER', 'HOST', 'ADMIN'))`, with case-insensitive uniqueness on `LOWER(auction_me_id)`. Sessions store only `SHA-256` token hashes in `user_sessions`.
- **Auction Lifecycle:** `SCHEDULED` → `LIVE` → `CLOSED`, constrained by `ends_at > starts_at`. Moderation status (`APPROVED`, `FLAGGED`, `SUSPENDED`) prevents bidding on suspended auctions.
- **Idempotency:** `CONSTRAINT bids_auction_request_unique UNIQUE (auction_id, request_id)` enforces database-level deduplication alongside transactional lookup.
- **Winner Determination:** `winner_id` remains `NULL` until the closing worker (or host manual close) atomically transitions `status` from `LIVE` to `CLOSED` and sets `winner_id = highest_bidder_id` and `closed_at = clock_timestamp()`.
- **Critical Indexes:**
  - `idx_auctions_status_ends_at (status, ends_at)` — closing worker scans.
  - `idx_bids_auction_created_at (auction_id, created_at DESC)` — auction bid history.
  - `idx_bids_bidder_created_at (bidder_id, created_at DESC)` — bidder ledger queries.
  - `idx_bids_request_id (request_id)` — fast idempotency checks.
  - `idx_users_auction_me_id_lower`, `idx_user_sessions_expires_at`, `idx_watchlist_user_created_at`, `idx_audit_logs_created_at`.

---

## 10. Demo Accounts and Seed Data

### Seeded Accounts (`backend/scripts/seed.js`)
Running `cd backend && npm run db:seed` idempotently upserts the three required role demo accounts plus two supporting competing bidders (all passwords hashed with `scrypt` using `DEMO_PASSWORD` from `backend/.env`):

| Role | Seeded `auction_me_id` | Display Name | Notes |
|---|---|---|---|
| `BIDDER` | `demo_bidder` | Demo Bidder | Primary bidder demo account (has active bids, won auction, watchlist & 4 notifications) |
| `HOST` | `demo_host` | Demo Auction House | Owns all 7 seeded auctions across LIVE, SCHEDULED, and CLOSED states |
| `ADMIN` | `demo_admin` | Demo Administrator | Can manage users/roles, moderate auctions, view complaints & audit logs |
| `BIDDER` | `bidder_aarav` | Aarav Mehta | Supporting competing bidder |
| `BIDDER` | `bidder_meera` | Meera Nair | Supporting competing bidder |

> **Credential Safety Note:** Passwords are configured via `DEMO_PASSWORD` in `backend/.env` and stored exclusively as salted `scrypt` hashes in PostgreSQL. Local seed output prints the configured assessment credentials only when `NODE_ENV !== 'production'`.

### Seeded Records & Idempotency
- **7 deterministic auctions** assigned to `demo_host`: 3 `LIVE`, 2 `SCHEDULED` (upcoming), and 2 `CLOSED` (including a won Rolex Datejust 1601 with `winner_id = 'demo_bidder'`).
- **13 monotonic valid bids**, **3 watchlist entries** for `demo_bidder`, **4 notifications** (`BID_ACCEPTED`, `OUTBID`, `AUCTION_EXTENDED`, `RESULT_DECLARED`), **1 sample complaint** (`OPEN`), and **2 audit log entries** for `demo_admin`.
- **Safe re-seeding:** All records use fixed deterministic UUIDs with `ON CONFLICT DO UPDATE` / `ON CONFLICT DO NOTHING` — running `npm run db:seed` repeatedly produces zero duplicates.

---

## 11. Auction Workflow & Concurrency Guarantees

Every `POST /api/auctions/:id/bids` executes the following sequence in [backend/src/services/biddingService.js](backend/src/services/biddingService.js):

1. **Input Validation:** Verifies valid UUIDs (`auctionId`, `requestId`), non-empty `bidderId`, and positive safe integer `amount` in paise. If authenticated, the server enforces the signed-in user's `auctionMeId` and blocks `HOST`/`ADMIN` accounts from bidding.
2. **Transaction Start:** `BEGIN`.
3. **Exclusive Row Lock:** `SELECT * FROM auctions WHERE id = $1 FOR UPDATE` — serializes all concurrent bid requests and closing worker checks for that auction.
4. **Authoritative Database Time:** `SELECT clock_timestamp()` **after** acquiring the row lock. Client timestamps and browser countdowns are never trusted.
5. **Idempotency Check:** Checks `bids` for `(auction_id, request_id)`. If already accepted, commits and returns the original bid (`200 OK`, `idempotentReplay: true`) without creating a duplicate row.
6. **Status, Moderation & Time Window Check:** Rejects if `SCHEDULED` / before `starts_at`, if `CLOSED`, if `moderation_status = 'SUSPENDED'`, or if `clock_timestamp() >= ends_at`.
7. **Minimum Increment Check:** Rejects with `409 BID_TOO_LOW` if `amount < current_price + min_increment`.
8. **Commit Bid & Update State:** Inserts into `bids`, updates `current_price`, `highest_bidder_id`, increments `version`, and applies **anti-sniping**: if `(ends_at - clock_timestamp()) <= INTERVAL '30 seconds'`, atomically extends `ends_at = ends_at + INTERVAL '30 seconds'`.
9. **Transaction Commit & Post-Commit Broadcast:** Executes `COMMIT`. Only after commit succeeds does Express emit `auction:update` to Socket.IO room `auction:<auctionId>`. On any rejection, `ROLLBACK` runs so rejected bids never mutate price or deadline.
10. **Atomic Closing Worker:** `closingService.js` scans `WHERE status = 'LIVE' AND ends_at <= clock_timestamp() FOR UPDATE SKIP LOCKED`, re-verifies expiry under the lock, sets `status = 'CLOSED'`, `winner_id = highest_bidder_id`, `closed_at = clock_timestamp()`, increments `version`, commits, and emits `auction:closed`.

---

## 12. API Documentation

All routes discovered directly in `backend/src/routes/*.js` and `backend/src/app.js`.

### System & Public Auction Routes
| Method | Route | Purpose | Auth | Role | Request Body / Query | Success Response | Error Responses |
|---|---|---|---|---|---|---|---|
| `GET` | `/api/health` | Server & DB health + `serverTime` | None | Any | — | `200 { status: "ok", serverTime }` | `503` DB unavailable |
| `GET` | `/api/auctions` | List auctions (`LIVE` first) | None | Any | — | `200 { auctions: [...] }` | `500` |
| `GET` | `/api/auctions/:id` | Authoritative auction state | None | Any | — | `200 { auction }` | `400` invalid UUID, `404` |
| `GET` | `/api/auctions/:id/bids` | Accepted bid ledger (newest first) | None | Any | `?limit=50` (1–200) | `200 { bids: [...] }` | `400`, `404` |
| `POST` | `/api/auctions/:id/bids` | Place transaction-safe bid | Optional* | `BIDDER` (if authed) | `{ bidderId, amount, requestId, socketId? }` | `201` (new) / `200` (idempotent replay) `{ accepted, extended, bid, auction, serverTime }` | `400` invalid input, `403` host/admin blocked, `404`, `409` (`BID_TOO_LOW`, `AUCTION_CLOSED`, `AUCTION_EXPIRED`, `AUCTION_NOT_STARTED`, `AUCTION_SUSPENDED`) |
| `GET` | `/api/auctions/:id/result` | Authoritative final result & winner | None | Any | — | `200 { result: { status, winnerId, finalPrice, bidCount, hadBids, closedAt, version } }` | `400`, `404` |

*\*When a session cookie/Bearer token is present, `POST /api/auctions/:id/bids` overrides `bidderId` with `req.user.auctionMeId` and enforces `BIDDER` role.*

### Authentication Routes (`/api/auth`)
| Method | Route | Purpose | Auth | Role | Request Body / Query | Success Response | Error Responses |
|---|---|---|---|---|---|---|---|
| `GET` | `/api/auth/check-id` | Check `auctionMeId` availability | None | Any | `?auctionMeId=...` | `200 { auctionMeId, available }` | `400` invalid format |
| `POST` | `/api/auth/register` | Register new `BIDDER` account | None | Public (assigns `BIDDER`) | `{ displayName, auctionMeId, password }` | `201 { user, token, expiresAt }` + `HttpOnly` cookie | `400` validation/weak password, `409` ID taken |
| `POST` | `/api/auth/login` | Sign in with AuctionMe ID + password | None | Any | `{ auctionMeId, password, rememberMe? }` | `200 { user, token, expiresAt }` + `HttpOnly` cookie | `400`, `401` invalid credentials, `403` inactive |
| `POST` | `/api/auth/logout` | Revoke session & clear cookie | Optional | Any | — | `200 { ok: true }` | `500` |
| `GET` | `/api/auth/me` | Get current authenticated user | **Required** | Any | — | `200 { user }` | `401` |

### Bidder Personal Routes (`/api/me`)
| Method | Route | Purpose | Auth | Role | Request Body / Query | Success Response | Error Responses |
|---|---|---|---|---|---|---|---|
| `GET` | `/api/me/bids` | Authenticated bidder's bid ledger | **Required** | Any authed | `?limit=100` | `200 { bids, summary }` | `401` |
| `GET` | `/api/me/holdings` | Auctions won by signed-in bidder | **Required** | Any authed | — | `200 { holdings, summary }` | `401` |
| `GET` | `/api/me/watchlist` | Signed-in bidder's saved auctions | **Required** | Any authed | — | `200 { watchlist }` | `401` |
| `POST` | `/api/me/watchlist/:auctionId` | Add auction to watchlist | **Required** | Any authed | — | `201 { added, auctionId }` | `400`, `401`, `404` |
| `DELETE` | `/api/me/watchlist/:auctionId` | Remove auction from watchlist | **Required** | Any authed | — | `200 { removed, auctionId }` | `400`, `401` |

### Host Routes (`/api/host`)
| Method | Route | Purpose | Auth | Role | Request Body | Success Response | Error Responses |
|---|---|---|---|---|---|---|---|
| `POST` | `/api/host/auctions` | Create a new auction | **Required** | `HOST`, `ADMIN` | `{ title, description, startingPrice, minIncrement, startsAt, endsAt, category?, imageUrl? }` | `201 { auction }` | `400`, `401`, `403` |
| `GET` | `/api/host/auctions` | List host's auctions | **Required** | `HOST`, `ADMIN` | — | `200 { auctions }` | `401`, `403` |
| `GET` | `/api/host/auctions/:id` | Get host auction detail | **Required** | `HOST`, `ADMIN` | — | `200 { auction }` | `401`, `403`, `404` |
| `PATCH` | `/api/host/auctions/:id` | Edit metadata (never `winnerId`/`currentPrice`) | **Required** | `HOST`, `ADMIN` | `{ title?, description?, category?, imageUrl? }` | `200 { auction }` | `400`, `401`, `403`, `404` |
| `POST` | `/api/host/auctions/:id/start` | Transition `SCHEDULED` → `LIVE` | **Required** | `HOST`, `ADMIN` | — | `200 { auction }` | `401`, `403`, `409` |
| `POST` | `/api/host/auctions/:id/close` | Atomically close owned auction | **Required** | `HOST`, `ADMIN` | — | `200 { auction }` | `401`, `403`, `409` |

### Administrator Routes (`/api/admin`)
| Method | Route | Purpose | Auth | Role | Request Body / Query | Success Response | Error Responses |
|---|---|---|---|---|---|---|---|
| `GET` | `/api/admin/users` | List all users | **Required** | `ADMIN` | — | `200 { users }` | `401`, `403` |
| `PATCH` | `/api/admin/users/:id/role` | Update user role | **Required** | `ADMIN` | `{ role: "BIDDER" \| "HOST" \| "ADMIN" }` | `200 { user }` | `400`, `401`, `403`, `404` |
| `PATCH` | `/api/admin/users/:id/status` | Activate / deactivate user | **Required** | `ADMIN` | `{ isActive: boolean }` | `200 { user }` | `400`, `401`, `403`, `404` |
| `GET` | `/api/admin/auctions` | List all auctions for moderation | **Required** | `ADMIN` | — | `200 { auctions }` | `401`, `403` |
| `PATCH` | `/api/admin/auctions/:id/moderate` | Set moderation status & note | **Required** | `ADMIN` | `{ moderationStatus, moderationNote? }` | `200 { auction }` | `400`, `401`, `403`, `404` |
| `GET` | `/api/admin/audit-logs` | List admin audit trail | **Required** | `ADMIN` | `?limit=50` | `200 { logs }` | `401`, `403` |

### Missing / Not Yet Implemented APIs
- **Notifications:** `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `POST /api/notifications/read-all`
- **Profile & Password Management:** `PATCH /api/auth/me` (display name edit), `POST /api/auth/change-password`, `PATCH /api/me/preferences`
- **Disputes:** Admin complaints/disputes endpoints
- **Auction Result Extended Stats:** `totalParticipants` and `extensionCount` fields in `GET /api/auctions/:id/result`

---

## 13. Real-Time Communication (Socket.IO)

Implemented in [backend/src/sockets/auctionSocket.js](backend/src/sockets/auctionSocket.js) and consumed via [frontend/src/hooks/useAuctionSocket.js](frontend/src/hooks/useAuctionSocket.js).

- **Connection:** Socket.IO attaches directly to the Express HTTP server (`http://localhost:4000`) with CORS configured via `CORS_ORIGIN` (`credentials: true`).
- **Room Naming:** `auction:<auctionId>`

| Direction | Event | Payload | Notes |
|---|---|---|---|
| Client → Server | `auction:join` | `{ auctionId }` | Joins `auction:<auctionId>` and acknowledges `{ ok, room, socketId }` |
| Client → Server | `auction:leave` | `{ auctionId }` | Leaves room on component unmount |
| Server → Room | `auction:update` | `{ auction, bid, version, extended, extensionSeconds, previousEndsAt, serverTime }` | Emitted **strictly after `COMMIT`** for new bids (not idempotent replays) |
| Server → Room | `auction:closed` | `{ auction, auctionId, status, winnerId, finalPrice, closedAt, hadBids, version, serverTime }` | Emitted **strictly after `COMMIT`** when closing worker or host closes an auction |
| Server → Socket | `bid:rejected` | `{ auctionId, bidderId, requestId, code, message, details, timestamp }` | Sent only to the submitting socket if `socketId` is connected |

- **Version Synchronization:** Clients track `versionRef.current` and drop any Socket.IO event where `payload.version <= versionRef.current`.
- **Reconnection Behavior:** On reconnect, `useAuctionSocket` re-joins `auction:<auctionId>` and triggers a REST state sync (`GET /api/auctions/:id` + `GET /api/auctions/:id/bids`) so no updates are lost during disconnections.

---

## 14. Testing

### Available Test Commands

```bash
# 1. Concurrency, Idempotency, Anti-Sniping & Closing Worker Suite (14 tests)
cd backend
npm run test:concurrency

# 2. Auth, RBAC, Host, Bidder & Admin API Verification Suite (10 tests)
cd backend
node scripts/verify-api.js

# 3. Frontend Production Build Verification
cd frontend
npm run build
```

### Verified Execution Results

| Suite | Command | Implemented | Executed | Passed | Coverage Highlights |
|---|---|---|---|---|---|
| **Concurrency & Engine** | `npm run test:concurrency` | 14 | 14 | **14 / 14** | 5 simultaneous identical bids (1 accepted, 4 rejected, 1 DB row); simultaneous ascending bids; below-increment, equal, zero/negative/decimal/string bids; concurrent & sequential duplicate `requestId`; pre-start & expired bids; `<=30s` exact `+30000ms` extension; `>30s` & rejected bid non-extension; 5 concurrent closing workers (single winner); no-bids close; bid-vs-close race |
| **Auth, RBAC & Role APIs** | `node scripts/verify-api.js` | 10 | 10 | **10 / 10** | Health check; `scrypt` password hashing & forced `BIDDER` role on register; case-insensitive duplicate ID (`409`); login valid/invalid (`401`); `401` unauthenticated & `403` RBAC enforcement; Host CRUD/start & immutability of `winnerId`/`currentPrice`; authenticated bidder ledger/holdings/watchlist; Admin moderation (`SUSPENDED` blocks bids) & audit logs |
| **Frontend Validation & Ledger Utils** | Inline Node `assert` checks | 15 | 15 | **15 / 15** | Sign-up field & password strength rules (8/8); Ledger summary metrics, filters, pagination & CSV builder (7/7) |
| **Frontend Production Build** | `npm run build` | 15 routes | Yes | **Passed** | Zero compilation/lint errors across all 15 Next.js App Router pages |

---

## 15. Troubleshooting

| Issue | Likely Cause | Resolution |
|---|---|---|
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL is not running | Run `docker compose up -d postgres` or start your local PostgreSQL service. |
| `password authentication failed` | `DATABASE_URL` credentials do not match PostgreSQL | Update `backend/.env` `DATABASE_URL` to match your local PostgreSQL role/password. |
| `EADDRINUSE :::3000` or `:::4000` | Another Node process is using port 3000 or 4000 | Stop the conflicting process or change `PORT` in `backend/.env`. |
| `npm run db:init` / `db:seed` fails | Database `live_auction` does not exist yet | Create database `live_auction` in PostgreSQL before running `npm run db:init`. |
| Frontend cannot reach backend / CORS errors | `NEXT_PUBLIC_API_URL` or `CORS_ORIGIN` mismatch | Ensure `CORS_ORIGIN=http://localhost:3000` in `backend/.env` and `NEXT_PUBLIC_API_URL=http://localhost:4000` in `frontend/.env.local`. |
| Socket.IO stuck on `Reconnecting...` | Backend server stopped or wrong `NEXT_PUBLIC_SOCKET_URL` | Confirm Express is running (`GET http://localhost:4000/api/health`) and `NEXT_PUBLIC_SOCKET_URL` matches. |
| `401 UNAUTHENTICATED` on `/api/me`, `/api/host`, `/api/admin` | Missing or expired session cookie / Bearer token | Sign in via `POST /api/auth/login` with `credentials: 'include'` or pass `Authorization: Bearer <token>`. |
| Windows `ENOENT` in `.next` during `next build` | `next dev` running concurrently with `next build` | Stop `next dev`, delete `frontend/.next`, and re-run `npm run build`. |

---

## 16. Security Considerations

### Implemented Protections
- **Password Hashing:** Salted `crypto.scryptSync` (16-byte random salt, 64-byte derived key) with constant-time comparison (`crypto.timingSafeEqual`). Plaintext passwords are never stored.
- **Session Management:** Opaque 256-bit random session tokens stored hashed (`SHA-256`) in `user_sessions`, delivered via `HttpOnly`, `SameSite=Lax` cookies (`Secure` in production).
- **Backend RBAC Enforcement:** `requireAuth` and `requireRole(...)` protect `/api/me`, `/api/host`, and `/api/admin`. Public registration always assigns `BIDDER` and ignores client-supplied roles.
- **SQL Injection Protection:** 100% parameterized queries (`$1, $2, ...`) via `pg`.
- **Transactional Integrity & Idempotency:** Row locks (`SELECT ... FOR UPDATE`), unique `(auction_id, request_id)` constraint, and strict rollback on errors.
- **Auction Result Integrity:** Hosts cannot edit `current_price`, `highest_bidder_id`, or `winner_id`; winners are determined solely by committed bids and server time.
- **Input Validation:** Strict UUID, integer-paise, length, and enum checks on API payloads.

### Not Yet Implemented (Security Backlog)
- Rate limiting on auth and bidding endpoints (`express-rate-limit` / Redis token bucket).
- CSRF double-submit token for cross-site cookie mutations.
- Account lockout / brute-force throttling on repeated failed logins.

---

## 17. Limitations and Future Improvements

### Implemented Core
- Transaction-safe PostgreSQL bidding engine with anti-sniping and single-winner closing worker.
- Real-time Socket.IO rooms with versioned updates and reconnection sync.
- Backend Auth, RBAC (`BIDDER`, `HOST`, `ADMIN`), Watchlist, Holdings, Ledger, Moderation, and Audit Log APIs.
- Complete Bidder frontend screens (Login, Sign Up, Discover, Live Room, Result, Ledger, Holdings, Watchlist, Notifications, Settings) with Light/Dark/System themes.

### Known Gaps & Planned Improvements
- **Frontend-to-Backend Wiring:** Connect `/signup` to `POST /api/auth/register` + `GET /api/auth/check-id`, and connect `/ledger` to `GET /api/me/bids` with active session context.
- **Host & Admin UI:** Build dedicated frontend dashboards for Host (`H01–H05`) and Admin moderation/user management.
- **Missing Backend Features:** Notifications API, profile editing / password change endpoints, and `totalParticipants` / `extensionCount` metrics in `/api/auctions/:id/result`.
- **Horizontal Scale:** Add `@socket.io/redis-streams-adapter` for multi-node Socket.IO fan-out, PgBouncer connection pooling, partial indexes on `status = 'LIVE'`, and transactional outbox event delivery.

---

## 18. Team / Academic Information

| Field | Details |
|---|---|
| **Student Name(s)** | `[Student Name(s)]` |
| **Enrollment Number(s)** | `[Enrollment Number(s)]` |
| **Institution** | `[Institution Name]` |
| **Department** | `[Department Name]` |
| **Project Guide** | `[Faculty / Guide Name]` |
| **Academic Year** | `[YYYY–YYYY]` |

---

## 19. License

No license file (`LICENSE`) is currently specified in this repository. All rights reserved by the project authors unless a license is explicitly added.
