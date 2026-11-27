const { pool } = require('../config/db');
const { AppError, isValidUuid, formatAuction, formatBid } = require('./helpers');

async function listAuctions() {
  const res = await pool.query(
    `SELECT a.*, u.display_name AS host_display_name, u.auction_me_id AS host_auction_me_id,
            clock_timestamp() AS db_now,
            (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) AS bid_count
     FROM auctions a
     LEFT JOIN users u ON u.id = a.host_user_id
     WHERE a.moderation_status <> 'SUSPENDED'
     ORDER BY
       CASE WHEN a.status = 'LIVE' THEN 0 WHEN a.status = 'SCHEDULED' THEN 1 ELSE 2 END,
       a.created_at DESC`
  );
  return res.rows.map((row) =>
    formatAuction(row, new Date(row.db_now).toISOString(), row.bid_count)
  );
}

async function getAuctionById(auctionId) {
  if (!isValidUuid(auctionId)) {
    throw new AppError(400, 'INVALID_AUCTION_ID', 'Invalid auction ID format.');
  }

  const res = await pool.query(
    `SELECT a.*, u.display_name AS host_display_name, u.auction_me_id AS host_auction_me_id,
            clock_timestamp() AS db_now,
            (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) AS bid_count
     FROM auctions a
     LEFT JOIN users u ON u.id = a.host_user_id
     WHERE a.id = $1`,
    [auctionId]
  );

  if (res.rows.length === 0) {
    throw new AppError(404, 'AUCTION_NOT_FOUND', 'Auction not found.');
  }

  const row = res.rows[0];
  return formatAuction(row, new Date(row.db_now).toISOString(), row.bid_count);
}

async function getAuctionBids(auctionId, limit = 50) {
  if (!isValidUuid(auctionId)) {
    throw new AppError(400, 'INVALID_AUCTION_ID', 'Invalid auction ID format.');
  }

  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 200);

  const existsRes = await pool.query('SELECT id FROM auctions WHERE id = $1', [
    auctionId,
  ]);
  if (existsRes.rows.length === 0) {
    throw new AppError(404, 'AUCTION_NOT_FOUND', 'Auction not found.');
  }

  const bidsRes = await pool.query(
    `SELECT * FROM bids
     WHERE auction_id = $1
     ORDER BY created_at DESC, amount DESC
     LIMIT $2`,
    [auctionId, safeLimit]
  );

  return bidsRes.rows.map(formatBid);
}

async function getAuctionResult(auctionId) {
  if (!isValidUuid(auctionId)) {
    throw new AppError(400, 'INVALID_AUCTION_ID', 'Invalid auction ID format.');
  }

  const res = await pool.query(
    `SELECT a.*, clock_timestamp() AS db_now,
            (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) AS bid_count
     FROM auctions a
     WHERE a.id = $1`,
    [auctionId]
  );

  if (res.rows.length === 0) {
    throw new AppError(404, 'AUCTION_NOT_FOUND', 'Auction not found.');
  }

  const row = res.rows[0];
  const bidCount = Number(row.bid_count);

  return {
    auctionId: row.id,
    title: row.title,
    status: row.status,
    winnerId: row.winner_id,
    highestBidderId: row.highest_bidder_id,
    finalPrice: Number(row.current_price),
    startingPrice: Number(row.starting_price),
    bidCount,
    hadBids: bidCount > 0,
    closedAt: row.closed_at ? new Date(row.closed_at).toISOString() : null,
    endsAt: new Date(row.ends_at).toISOString(),
    version: Number(row.version),
    serverTime: new Date(row.db_now).toISOString(),
  };
}

module.exports = {
  listAuctions,
  getAuctionById,
  getAuctionBids,
  getAuctionResult,
};
