# AuctionMe — The Art of the Bid.

A full-stack, real-time online auction platform built with **Next.js (App Router)**, **React**, **Express.js**, **Socket.IO**, and **PostgreSQL**.

AuctionMe enforces strict transactional integrity for concurrent bidding using PostgreSQL row-level locks (`SELECT ... FOR UPDATE`), authoritative database-clock anti-sniping extensions (`+30 seconds` when `<= 30 seconds` remain), atomic single-winner closing (`FOR UPDATE SKIP LOCKED`), server-side session authentication with `scrypt` password hashing, and role-based access control (`BIDDER`, `HOST`, `ADMIN`).

---

## Table of Contents

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
| Help & Support | **UI Implemented / Backend Missing** | `/help` (live FAQ search & rules work; support ticket submission API not implemented) |

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
        │   ├── settings/page.js        # Screen 10 — Profile & Settings
        │   └── help/page.js            # Screen 11 — Help & Support
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
- **Help & Support (Screen 11):** `http://localhost:3000/help`

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

### Actual Seeded Accounts (`backend/scripts/seed.js`)
Running `cd backend && npm run db:seed` upserts four local development accounts (all passwords hashed with `scrypt`):

| Role | Seeded `auction_me_id` | Display Name | Assessment Alias Note |
|---|---|---|---|
| `BIDDER` | `bidder-aarav-01` | Aarav Mehta | Assessment spec mentions `demo_bidder` (not currently seeded under that ID) |
| `BIDDER` | `bidder-meera-02` | Meera Nair | Secondary bidder for multi-client testing |
| `HOST` | `host-curate-01` | Curated Horology House | Assessment spec mentions `demo_host` (not currently seeded under that ID) |
| `ADMIN` | `admin-01` | AuctionMe Admin | Assessment spec mentions `demo_admin` (not currently seeded under that ID) |

> **Credential Safety Note:** Local seed passwords are defined only inside `backend/scripts/seed.js` for local development and are intentionally omitted from this README. For shared or staging environments, configure seed passwords via environment variables (e.g., `SEED_ADMIN_PASSWORD`, `SEED_HOST_PASSWORD`, `SEED_BIDDER_PASSWORD`) and **never** reuse local assessment credentials in production.

### Seeded Auction Record & Safe Re-Seeding
- Seeds one live demonstration auction (`11111111-1111-4111-8111-111111111111` — *1969 Grand Seiko Hi-Beat 36000 — Collector Edition*, starting price `₹25,000`, current price `₹26,500`, minimum increment `₹500`, 5-minute remaining window) with two initial bids (`bidder-meera-02` and `bidder-aarav-01`).
- **Safe re-seeding:** `npm run db:seed` uses `ON CONFLICT (auction_me_id) DO UPDATE` for users and deletes/re-inserts only the fixed demo auction UUID, making repeated execution idempotent and deterministic.

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
- **Support & Disputes:** `POST /api/support/tickets`, Admin complaints/disputes endpoints
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
- Complete Bidder frontend screens (Login, Sign Up, Discover, Live Room, Result, Ledger, Holdings, Watchlist, Notifications, Settings, Help) with Light/Dark/System themes.

### Known Gaps & Planned Improvements
- **Frontend-to-Backend Wiring:** Connect `/signup` to `POST /api/auth/register` + `GET /api/auth/check-id`, and connect `/ledger` to `GET /api/me/bids` with active session context.
- **Host & Admin UI:** Build dedicated frontend dashboards for Host (`H01–H05`) and Admin moderation/user management.
- **Missing Backend Features:** Notifications API, profile editing / password change endpoints, support ticket persistence, and `totalParticipants` / `extensionCount` metrics in `/api/auctions/:id/result`.
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
