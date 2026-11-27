const { pool } = require('../config/db');
const { AppError, isValidUuid, formatAuction } = require('./helpers');

async function getMyBids(user, limit = 100) {
  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 100, 1), 200);
  const bidderId = user.auctionMeId;

  const res = await pool.query(
    `SELECT
       b.id,
       b.auction_id,
       b.bidder_id,
       b.amount,
       b.request_id,
       b.created_at,
       a.title AS auction_title,
       a.status AS auction_status,
       a.current_price,
       a.highest_bidder_id,
       a.winner_id,
       a.image_url,
       a.ends_at,
       a.closed_at
     FROM bids b
     INNER JOIN auctions a ON a.id = b.auction_id
     WHERE b.bidder_id = $1
     ORDER BY b.created_at DESC, b.amount DESC
     LIMIT $2`,
    [bidderId, safeLimit]
  );

  const bids = res.rows.map((row) => {
    const amount = Number(row.amount);
    const currentPrice = Number(row.current_price);
    let status = 'outbid';

    if (
      row.auction_status === 'CLOSED' &&
      row.winner_id === bidderId &&
      amount === currentPrice
    ) {
      status = 'won';
    } else if (
      row.auction_status === 'LIVE' &&
      row.highest_bidder_id === bidderId &&
      amount === currentPrice
    ) {
      status = 'accepted';
    } else {
      status = 'outbid';
    }

    return {
      id: row.id,
      auctionId: row.auction_id,
      lotNumber: `LOT #${String(row.auction_id).slice(0, 8).toUpperCase()}`,
      auctionTitle: row.auction_title,
      auctionStatus: row.auction_status,
      bidderId: row.bidder_id,
      amount,
      currentPrice,
      status,
      requestId: row.request_id,
      thumbnailUrl: row.image_url || null,
      createdAt: new Date(row.created_at).toISOString(),
      endsAt: new Date(row.ends_at).toISOString(),
      closedAt: row.closed_at ? new Date(row.closed_at).toISOString() : null,
    };
  });

  return {
    bidderId,
    bids,
  };
}

async function getMyHoldings(user) {
  const bidderId = user.auctionMeId;

  const [wonRes, leadingRes, completedRes] = await Promise.all([
    pool.query(
      `SELECT a.*, u.display_name AS host_display_name, clock_timestamp() AS db_now,
              (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) AS bid_count
       FROM auctions a
       LEFT JOIN users u ON u.id = a.host_user_id
       WHERE a.status = 'CLOSED' AND a.winner_id = $1
       ORDER BY a.closed_at DESC NULLS LAST, a.ends_at DESC`,
      [bidderId]
    ),
    pool.query(
      `SELECT a.*, u.display_name AS host_display_name, clock_timestamp() AS db_now,
              (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) AS bid_count
       FROM auctions a
       LEFT JOIN users u ON u.id = a.host_user_id
       WHERE a.status = 'LIVE' AND a.highest_bidder_id = $1
       ORDER BY a.ends_at ASC`,
      [bidderId]
    ),
    pool.query(
      `SELECT a.*, u.display_name AS host_display_name, clock_timestamp() AS db_now,
              (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) AS bid_count
       FROM auctions a
       LEFT JOIN users u ON u.id = a.host_user_id
       WHERE a.status = 'CLOSED'
         AND EXISTS (
           SELECT 1 FROM bids b
           WHERE b.auction_id = a.id AND b.bidder_id = $1
         )
       ORDER BY a.closed_at DESC NULLS LAST, a.ends_at DESC`,
      [bidderId]
    ),
  ]);

  const mapRows = (rows) =>
    rows.map((row) => {
      const formatted = formatAuction(
        row,
        new Date(row.db_now).toISOString(),
        row.bid_count
      );
      return {
        ...formatted,
        finalPrice: formatted.currentPrice,
      };
    });

  return {
    bidderId,
    wonAuctions: mapRows(wonRes.rows),
    leadingAuctions: mapRows(leadingRes.rows),
    completedAuctions: mapRows(completedRes.rows),
  };
}

async function getMyWatchlist(user) {
  const res = await pool.query(
    `SELECT a.*, u.display_name AS host_display_name, w.created_at AS watched_at,
            clock_timestamp() AS db_now,
            (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) AS bid_count
     FROM watchlist w
     INNER JOIN auctions a ON a.id = w.auction_id
     LEFT JOIN users u ON u.id = a.host_user_id
     WHERE w.user_id = $1
     ORDER BY w.created_at DESC`,
    [user.id]
  );

  const auctions = res.rows.map((row) => ({
    ...formatAuction(row, new Date(row.db_now).toISOString(), row.bid_count),
    watchedAt: new Date(row.watched_at).toISOString(),
  }));

  return {
    auctionIds: auctions.map((a) => a.id),
    auctions,
  };
}

async function addToWatchlist(user, auctionId) {
  if (!isValidUuid(auctionId)) {
    throw new AppError(400, 'INVALID_AUCTION_ID', 'Invalid auction ID format.');
  }

  const existsRes = await pool.query('SELECT id FROM auctions WHERE id = $1', [
    auctionId,
  ]);
  if (existsRes.rows.length === 0) {
    throw new AppError(404, 'AUCTION_NOT_FOUND', 'Auction not found.');
  }

  await pool.query(
    `INSERT INTO watchlist (user_id, auction_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, auction_id) DO NOTHING`,
    [user.id, auctionId]
  );

  return { ok: true, auctionId };
}

async function removeFromWatchlist(user, auctionId) {
  if (!isValidUuid(auctionId)) {
    throw new AppError(400, 'INVALID_AUCTION_ID', 'Invalid auction ID format.');
  }

  await pool.query(
    'DELETE FROM watchlist WHERE user_id = $1 AND auction_id = $2',
    [user.id, auctionId]
  );

  return { ok: true, auctionId };
}

module.exports = {
  getMyBids,
  getMyHoldings,
  getMyWatchlist,
  addToWatchlist,
  removeFromWatchlist,
};
