const { pool } = require('../config/db');
const { AppError, isValidUuid, formatAuction, formatBid } = require('./helpers');

function validateBidPayload({ auctionId, bidderId, amount, requestId }) {
  if (!isValidUuid(auctionId)) {
    throw new AppError(400, 'INVALID_AUCTION_ID', 'Invalid auction ID format.');
  }
  if (typeof bidderId !== 'string' || bidderId.trim().length === 0) {
    throw new AppError(400, 'INVALID_BIDDER_ID', 'bidderId must be a non-empty string.');
  }
  if (bidderId.trim().length > 100) {
    throw new AppError(400, 'INVALID_BIDDER_ID', 'bidderId is too long (max 100 chars).');
  }
  if (
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    !Number.isSafeInteger(amount) ||
    amount <= 0
  ) {
    throw new AppError(
      400,
      'INVALID_BID_AMOUNT',
      'amount must be a positive integer in paise.'
    );
  }
  if (!isValidUuid(requestId)) {
    throw new AppError(400, 'INVALID_REQUEST_ID', 'requestId must be a valid UUID.');
  }
}

/**
 * Transaction-safe bidding engine.
 * Serializes concurrent bids per auction using SELECT ... FOR UPDATE,
 * validates against authoritative PostgreSQL clock_timestamp(),
 * enforces idempotency via (auction_id, request_id), and applies
 * anti-sniping (+30s extension when <= 30s remain).
 */
async function placeBid({ auctionId, bidderId, amount, requestId, actorUserId = null }) {
  validateBidPayload({ auctionId, bidderId, amount, requestId });
  const trimmedBidderId = bidderId.trim();

  const client = await pool.connect();
  let inTransaction = false;

  try {
    // 1. BEGIN transaction
    await client.query('BEGIN');
    inTransaction = true;

    // 2. Lock the auction row (serializes concurrent bids and closing worker)
    const auctionRes = await client.query(
      'SELECT * FROM auctions WHERE id = $1 FOR UPDATE',
      [auctionId]
    );

    // 4. Check auction existence
    if (auctionRes.rows.length === 0) {
      await client.query('ROLLBACK');
      inTransaction = false;
      throw new AppError(404, 'AUCTION_NOT_FOUND', 'Auction not found.');
    }
    const auction = auctionRes.rows[0];

    // 3. Obtain authoritative PostgreSQL time AFTER acquiring the row lock
    const timeCheckRes = await client.query(
      `WITH t AS (SELECT clock_timestamp() AS db_now)
       SELECT
         db_now,
         (db_now < $1::timestamptz) AS before_start,
         (db_now >= $2::timestamptz) AS is_expired,
         (($2::timestamptz - db_now) <= INTERVAL '30 seconds') AS should_extend
       FROM t`,
      [auction.starts_at, auction.ends_at]
    );
    const { db_now, before_start, is_expired, should_extend } = timeCheckRes.rows[0];
    const dbNowIso = new Date(db_now).toISOString();

    // 7-8. Idempotency check: if requestId was already accepted for this auction,
    // return the original accepted bid result without creating a duplicate.
    const existingBidRes = await client.query(
      'SELECT * FROM bids WHERE auction_id = $1 AND request_id = $2',
      [auctionId, requestId]
    );
    if (existingBidRes.rows.length > 0) {
      const existingBid = existingBidRes.rows[0];
      const countRes = await client.query(
        'SELECT COUNT(*) AS bid_count FROM bids WHERE auction_id = $1',
        [auctionId]
      );
      await client.query('COMMIT');
      inTransaction = false;

      return {
        idempotentReplay: true,
        extended: false,
        extensionSeconds: 0,
        previousEndsAt: new Date(auction.ends_at).toISOString(),
        bid: formatBid(existingBid),
        auction: formatAuction(auction, dbNowIso, countRes.rows[0].bid_count),
        serverTime: dbNowIso,
      };
    }

    // 5-6. Validate auction status, moderation state, ownership, and authoritative time window
    if (auction.moderation_status === 'SUSPENDED') {
      await client.query('ROLLBACK');
      inTransaction = false;
      throw new AppError(
        409,
        'AUCTION_SUSPENDED',
        'This auction has been suspended by an administrator and is not accepting bids.',
        {
          moderationStatus: auction.moderation_status,
          version: Number(auction.version),
        }
      );
    }

    if (actorUserId && auction.host_user_id && auction.host_user_id === actorUserId) {
      await client.query('ROLLBACK');
      inTransaction = false;
      throw new AppError(
        403,
        'HOST_CANNOT_BID_OWN_AUCTION',
        'Hosts cannot place bids on their own auctions.'
      );
    }

    if (auction.status === 'SCHEDULED' || before_start) {
      await client.query('ROLLBACK');
      inTransaction = false;
      throw new AppError(
        409,
        'AUCTION_NOT_STARTED',
        'This auction has not started yet.',
        {
          startsAt: new Date(auction.starts_at).toISOString(),
          serverTime: dbNowIso,
          version: Number(auction.version),
        }
      );
    }

    if (auction.status !== 'LIVE') {
      await client.query('ROLLBACK');
      inTransaction = false;
      throw new AppError(
        409,
        'AUCTION_CLOSED',
        'This auction is closed and no longer accepting bids.',
        {
          status: auction.status,
          winnerId: auction.winner_id,
          version: Number(auction.version),
        }
      );
    }

    if (is_expired) {
      await client.query('ROLLBACK');
      inTransaction = false;
      throw new AppError(
        409,
        'AUCTION_EXPIRED',
        'This auction has expired and is no longer accepting bids.',
        {
          endsAt: new Date(auction.ends_at).toISOString(),
          serverTime: dbNowIso,
          version: Number(auction.version),
        }
      );
    }

    // 9-10. Validate minimum bid: amount >= current_price + min_increment
    const currentPrice = Number(auction.current_price);
    const minIncrement = Number(auction.min_increment);
    const minNextBid = currentPrice + minIncrement;

    if (amount < minNextBid) {
      await client.query('ROLLBACK');
      inTransaction = false;
      throw new AppError(
        409,
        'BID_TOO_LOW',
        `Bid rejected. Minimum next bid is ₹${(minNextBid / 100).toLocaleString('en-IN')}.`,
        {
          currentPrice,
          minIncrement,
          minNextBid,
          version: Number(auction.version),
        }
      );
    }

    // 11. Insert accepted bid
    const insertBidRes = await client.query(
      `INSERT INTO bids (auction_id, bidder_id, amount, request_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [auctionId, trimmedBidderId, amount, requestId]
    );
    const insertedBid = insertBidRes.rows[0];

    // 12-15. Atomically update price, highest bidder, version, and anti-sniping extension (+30s)
    const previousEndsAtIso = new Date(auction.ends_at).toISOString();
    const updateAuctionRes = await client.query(
      `UPDATE auctions
       SET
         current_price = $2,
         highest_bidder_id = $3,
         version = version + 1,
         ends_at = CASE
           WHEN $4::boolean THEN ends_at + INTERVAL '30 seconds'
           ELSE ends_at
         END
       WHERE id = $1
       RETURNING *`,
      [auctionId, amount, trimmedBidderId, should_extend]
    );
    const updatedAuction = updateAuctionRes.rows[0];

    const countRes = await client.query(
      'SELECT COUNT(*) AS bid_count FROM bids WHERE auction_id = $1',
      [auctionId]
    );

    // 16. COMMIT transaction
    await client.query('COMMIT');
    inTransaction = false;

    const extended = Boolean(should_extend);

    return {
      idempotentReplay: false,
      extended,
      extensionSeconds: extended ? 30 : 0,
      previousEndsAt: previousEndsAtIso,
      bid: formatBid(insertedBid),
      auction: formatAuction(updatedAuction, dbNowIso, countRes.rows[0].bid_count),
      serverTime: dbNowIso,
    };
  } catch (err) {
    if (inTransaction) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('[BiddingService] Rollback error:', rollbackErr.message);
      }
    }

    if (err instanceof AppError) {
      throw err;
    }

    // Fallback protection if unique constraint on (auction_id, request_id) triggered
    if (err && err.code === '23505') {
      const existingRes = await pool.query(
        'SELECT * FROM bids WHERE auction_id = $1 AND request_id = $2',
        [auctionId, requestId]
      );
      const auctionRes = await pool.query(
        `SELECT a.*, clock_timestamp() AS db_now,
                (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) AS bid_count
         FROM auctions a WHERE a.id = $1`,
        [auctionId]
      );
      if (existingRes.rows.length > 0 && auctionRes.rows.length > 0) {
        const aRow = auctionRes.rows[0];
        const serverTimeIso = new Date(aRow.db_now).toISOString();
        return {
          idempotentReplay: true,
          extended: false,
          extensionSeconds: 0,
          previousEndsAt: new Date(aRow.ends_at).toISOString(),
          bid: formatBid(existingRes.rows[0]),
          auction: formatAuction(aRow, serverTimeIso, aRow.bid_count),
          serverTime: serverTimeIso,
        };
      }
    }

    console.error('[BiddingService] Unexpected DB error:', err);
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to process bid.');
  } finally {
    client.release();
  }
}

module.exports = { placeBid };
