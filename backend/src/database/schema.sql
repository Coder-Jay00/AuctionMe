-- Live Auction Platform Schema (Idempotent & Non-Destructive)
-- All monetary amounts are stored as BIGINT integer paise (1 INR = 100 paise).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users & Role-Based Access Control
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_me_id VARCHAR(64) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'BIDDER' CHECK (role IN ('BIDDER', 'HOST', 'ADMIN')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auction_me_id_lower
  ON users (LOWER(auction_me_id));

CREATE INDEX IF NOT EXISTS idx_users_role
  ON users (role);

-- Server-side opaque sessions (stores SHA-256 hash of session token, never plaintext)
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
  ON user_sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at
  ON user_sessions (expires_at);

-- Core Auctions Table (preserved)
CREATE TABLE IF NOT EXISTS auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('SCHEDULED', 'LIVE', 'CLOSED')),
  starting_price BIGINT NOT NULL CHECK (starting_price >= 0),
  current_price BIGINT NOT NULL CHECK (current_price >= 0),
  min_increment BIGINT NOT NULL CHECK (min_increment > 0),
  highest_bidder_id TEXT,
  winner_id TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  version BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT auctions_time_window_check CHECK (ends_at > starts_at)
);

-- Safe additive columns on auctions for host ownership, catalog metadata, and moderation
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS host_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS category VARCHAR(64);
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) NOT NULL DEFAULT 'APPROVED';
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS moderation_note TEXT;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auctions_moderation_status_check'
  ) THEN
    ALTER TABLE auctions
      ADD CONSTRAINT auctions_moderation_status_check
      CHECK (moderation_status IN ('APPROVED', 'FLAGGED', 'SUSPENDED'));
  END IF;
END $$;

-- Core Bids Table (preserved)
CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id TEXT NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  request_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bids_auction_request_unique UNIQUE (auction_id, request_id)
);

-- Bidder Watchlist Persistence
CREATE TABLE IF NOT EXISTS watchlist (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, auction_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_created_at
  ON watchlist (user_id, created_at DESC);

-- Admin Audit Log
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(80) NOT NULL,
  target_type VARCHAR(40) NOT NULL,
  target_id TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs (created_at DESC);

-- User Notifications (bid accepted, outbid, auction extended, result declared)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
  type VARCHAR(40) NOT NULL CHECK (
    type IN ('BID_ACCEPTED', 'OUTBID', 'AUCTION_EXTENDED', 'RESULT_DECLARED', 'SYSTEM')
  ),
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
  ON notifications (user_id, created_at DESC);

-- Complaints / Disputes for Admin Moderation
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  auction_id UUID REFERENCES auctions(id) ON DELETE SET NULL,
  subject VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED')),
  resolution_note TEXT,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaints_status_created_at
  ON complaints (status, created_at DESC);

-- Indexes for core auction engine & personal queries
CREATE INDEX IF NOT EXISTS idx_auctions_status_ends_at
  ON auctions (status, ends_at);

CREATE INDEX IF NOT EXISTS idx_auctions_host_user_id
  ON auctions (host_user_id);

CREATE INDEX IF NOT EXISTS idx_bids_auction_created_at
  ON bids (auction_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bids_bidder_created_at
  ON bids (bidder_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bids_request_id
  ON bids (request_id);
