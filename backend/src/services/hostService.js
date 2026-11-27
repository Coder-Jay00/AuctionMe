const { pool } = require('../config/db');
const { AppError, isValidUuid, formatAuction } = require('./helpers');
const { emitAuctionClosed } = require('../sockets/auctionSocket');

const FORBIDDEN_HOST_FIELDS = [
  'currentPrice',
  'current_price',
  'highestBidderId',
  'highest_bidder_id',
  'winnerId',
  'winner_id',
  'closedAt',
  'closed_at',
  'version',
  'bids',
  'moderationStatus',
  'moderation_status',
];

function assertNoForbiddenFields(payload) {
  for (const field of FORBIDDEN_HOST_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      throw new AppError(
        403,
        'FORBIDDEN_FIELD_MODIFICATION',
        `Hosts are not permitted to modify '${field}'. Auction pricing, bids, and winners are strictly server-controlled.`
      );
    }
  }
}

function parsePositiveInt(value, fieldName, { allowZero = false } = {}) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isSafeInteger(value) ||
    (allowZero ? value < 0 : value <= 0)
  ) {
    throw new AppError(
      400,
      'INVALID_AMOUNT',
      `${fieldName} must be ${allowZero ? 'a non-negative' : 'a positive'} integer in paise.`
    );
  }
  return value;
}

function parseTimestamp(value, fieldName) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    throw new AppError(
      400,
      'INVALID_TIMESTAMP',
      `${fieldName} must be a valid ISO-8601 timestamp.`
    );
  }
  return date;
}

async function createHostAuction(hostUser, payload = {}) {
  assertNoForbiddenFields(payload);

  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const description =
    typeof payload.description === 'string' ? payload.description.trim() : '';
  const category =
    typeof payload.category === 'string' && payload.category.trim()
      ? payload.category.trim().slice(0, 64)
      : null;
  const imageUrl =
    typeof payload.imageUrl === 'string' && payload.imageUrl.trim()
      ? payload.imageUrl.trim().slice(0, 1000)
      : null;

  if (title.length < 3 || title.length > 200) {
    throw new AppError(
      400,
      'INVALID_TITLE',
      'Title must be between 3 and 200 characters.'
    );
  }
  if (description.length < 5 || description.length > 4000) {
    throw new AppError(
      400,
      'INVALID_DESCRIPTION',
      'Description must be between 5 and 4000 characters.'
    );
  }

  const startingPrice = parsePositiveInt(
    payload.startingPrice,
    'startingPrice',
    { allowZero: true }
  );
  const minIncrement = parsePositiveInt(payload.minIncrement, 'minIncrement');

  const requestedStatus = payload.status || 'SCHEDULED';
  if (requestedStatus !== 'SCHEDULED' && requestedStatus !== 'LIVE') {
    throw new AppError(
      400,
      'INVALID_STATUS',
      'New auctions can only be created with status SCHEDULED or LIVE.'
    );
  }

  const startsAt = payload.startsAt
    ? parseTimestamp(payload.startsAt, 'startsAt')
    : new Date();
  const endsAt = parseTimestamp(payload.endsAt, 'endsAt');

  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new AppError(
      400,
      'INVALID_TIME_WINDOW',
      'endsAt must be strictly after startsAt.'
    );
  }
  if (endsAt.getTime() <= Date.now()) {
    throw new AppError(
      400,
      'INVALID_END_TIME',
      'endsAt must be in the future.'
    );
  }

  const res = await pool.query(
    `INSERT INTO auctions (
       title, description, status,
       starting_price, current_price, min_increment,
       highest_bidder_id, winner_id,
       starts_at, ends_at, version,
       host_user_id, category, image_url, moderation_status
     )
     VALUES ($1, $2, $3, $4, $4, $5, NULL, NULL, $6, $7, 1, $8, $9, $10, 'APPROVED')
     RETURNING *, clock_timestamp() AS db_now`,
    [
      title,
      description,
      requestedStatus,
      startingPrice,
      minIncrement,
      startsAt.toISOString(),
      endsAt.toISOString(),
      hostUser.id,
      category,
      imageUrl,
    ]
  );

  const row = res.rows[0];
  row.host_display_name = hostUser.displayName;
  return formatAuction(row, new Date(row.db_now).toISOString(), 0);
}

async function listHostAuctions(hostUser) {
  const res = await pool.query(
    `SELECT a.*, u.display_name AS host_display_name, u.auction_me_id AS host_auction_me_id,
            clock_timestamp() AS db_now,
            (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) AS bid_count
     FROM auctions a
     LEFT JOIN users u ON u.id = a.host_user_id
     WHERE a.host_user_id = $1
     ORDER BY a.created_at DESC`,
    [hostUser.id]
  );
  return res.rows.map((row) =>
    formatAuction(row, new Date(row.db_now).toISOString(), row.bid_count)
  );
}

async function getHostAuctionById(hostUser, auctionId) {
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
  if (hostUser.role !== 'ADMIN' && row.host_user_id !== hostUser.id) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'You do not have permission to access this auction.'
    );
  }

  return formatAuction(row, new Date(row.db_now).toISOString(), row.bid_count);
}

async function updateHostAuction(hostUser, auctionId, payload = {}) {
  if (!isValidUuid(auctionId)) {
    throw new AppError(400, 'INVALID_AUCTION_ID', 'Invalid auction ID format.');
  }
  assertNoForbiddenFields(payload);

  const client = await pool.connect();
  let inTx = false;
  try {
    await client.query('BEGIN');
    inTx = true;

    const existingRes = await client.query(
      'SELECT * FROM auctions WHERE id = $1 FOR UPDATE',
      [auctionId]
    );
    if (existingRes.rows.length === 0) {
      throw new AppError(404, 'AUCTION_NOT_FOUND', 'Auction not found.');
    }
    const existing = existingRes.rows[0];

    if (hostUser.role !== 'ADMIN' && existing.host_user_id !== hostUser.id) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'You do not have permission to update this auction.'
      );
    }

    if (existing.status === 'CLOSED') {
      throw new AppError(
        409,
        'AUCTION_CLOSED',
        'Closed auctions cannot be modified.'
      );
    }

    const bidCountRes = await client.query(
      'SELECT COUNT(*)::int AS cnt FROM bids WHERE auction_id = $1',
      [auctionId]
    );
    const bidCount = bidCountRes.rows[0].cnt;

    const nextTitle =
      payload.title !== undefined ? String(payload.title).trim() : existing.title;
    const nextDescription =
      payload.description !== undefined
        ? String(payload.description).trim()
        : existing.description;
    const nextCategory =
      payload.category !== undefined
        ? payload.category
          ? String(payload.category).trim().slice(0, 64)
          : null
        : existing.category;
    const nextImageUrl =
      payload.imageUrl !== undefined
        ? payload.imageUrl
          ? String(payload.imageUrl).trim().slice(0, 1000)
          : null
        : existing.image_url;

    if (nextTitle.length < 3 || nextTitle.length > 200) {
      throw new AppError(
        400,
        'INVALID_TITLE',
        'Title must be between 3 and 200 characters.'
      );
    }
    if (nextDescription.length < 5 || nextDescription.length > 4000) {
      throw new AppError(
        400,
        'INVALID_DESCRIPTION',
        'Description must be between 5 and 4000 characters.'
      );
    }

    // Pricing and schedule changes are only allowed while SCHEDULED and with 0 bids
    const wantsPricingOrScheduleEdit =
      payload.startingPrice !== undefined ||
      payload.minIncrement !== undefined ||
      payload.startsAt !== undefined ||
      payload.endsAt !== undefined;

    if (wantsPricingOrScheduleEdit && (existing.status !== 'SCHEDULED' || bidCount > 0)) {
      throw new AppError(
        409,
        'LIVE_AUCTION_LOCKED',
        'Pricing and schedule can only be edited on SCHEDULED auctions with no bids.'
      );
    }

    const nextStartingPrice =
      payload.startingPrice !== undefined
        ? parsePositiveInt(payload.startingPrice, 'startingPrice', { allowZero: true })
        : Number(existing.starting_price);
    const nextCurrentPrice =
      payload.startingPrice !== undefined && bidCount === 0
        ? nextStartingPrice
        : Number(existing.current_price);
    const nextMinIncrement =
      payload.minIncrement !== undefined
        ? parsePositiveInt(payload.minIncrement, 'minIncrement')
        : Number(existing.min_increment);
    const nextStartsAt =
      payload.startsAt !== undefined
        ? parseTimestamp(payload.startsAt, 'startsAt').toISOString()
        : new Date(existing.starts_at).toISOString();
    const nextEndsAt =
      payload.endsAt !== undefined
        ? parseTimestamp(payload.endsAt, 'endsAt').toISOString()
        : new Date(existing.ends_at).toISOString();

    if (new Date(nextEndsAt).getTime() <= new Date(nextStartsAt).getTime()) {
      throw new AppError(
        400,
        'INVALID_TIME_WINDOW',
        'endsAt must be strictly after startsAt.'
      );
    }

    const updatedRes = await client.query(
      `UPDATE auctions
       SET
         title = $2,
         description = $3,
         category = $4,
         image_url = $5,
         starting_price = $6,
         current_price = $7,
         min_increment = $8,
         starts_at = $9,
         ends_at = $10,
         version = version + 1,
         updated_at = clock_timestamp()
       WHERE id = $1
       RETURNING *, clock_timestamp() AS db_now`,
      [
        auctionId,
        nextTitle,
        nextDescription,
        nextCategory,
        nextImageUrl,
        nextStartingPrice,
        nextCurrentPrice,
        nextMinIncrement,
        nextStartsAt,
        nextEndsAt,
      ]
    );

    await client.query('COMMIT');
    inTx = false;

    const row = updatedRes.rows[0];
    return formatAuction(row, new Date(row.db_now).toISOString(), bidCount);
  } catch (err) {
    if (inTx) {
      await client.query('ROLLBACK').catch(() => {});
    }
    throw err;
  } finally {
    client.release();
  }
}

async function startHostAuction(hostUser, auctionId) {
  if (!isValidUuid(auctionId)) {
    throw new AppError(400, 'INVALID_AUCTION_ID', 'Invalid auction ID format.');
  }

  const client = await pool.connect();
  let inTx = false;
  try {
    await client.query('BEGIN');
    inTx = true;

    const existingRes = await client.query(
      'SELECT *, clock_timestamp() AS db_now FROM auctions WHERE id = $1 FOR UPDATE',
      [auctionId]
    );
    if (existingRes.rows.length === 0) {
      throw new AppError(404, 'AUCTION_NOT_FOUND', 'Auction not found.');
    }
    const existing = existingRes.rows[0];

    if (hostUser.role !== 'ADMIN' && existing.host_user_id !== hostUser.id) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'You do not have permission to start this auction.'
      );
    }
    if (existing.moderation_status === 'SUSPENDED') {
      throw new AppError(
        409,
        'AUCTION_SUSPENDED',
        'Suspended auctions cannot be started.'
      );
    }
    if (existing.status !== 'SCHEDULED') {
      throw new AppError(
        409,
        'INVALID_STATE_TRANSITION',
        `Only SCHEDULED auctions can be started (current status: ${existing.status}).`
      );
    }
    if (new Date(existing.ends_at).getTime() <= new Date(existing.db_now).getTime()) {
      throw new AppError(
        409,
        'AUCTION_EXPIRED',
        'Cannot start an auction whose end time has already passed.'
      );
    }

    const updatedRes = await client.query(
      `UPDATE auctions
       SET
         status = 'LIVE',
         starts_at = LEAST(starts_at, clock_timestamp()),
         version = version + 1,
         updated_at = clock_timestamp()
       WHERE id = $1
       RETURNING *, clock_timestamp() AS db_now`,
      [auctionId]
    );

    const countRes = await client.query(
      'SELECT COUNT(*)::int AS cnt FROM bids WHERE auction_id = $1',
      [auctionId]
    );

    await client.query('COMMIT');
    inTx = false;

    const row = updatedRes.rows[0];
    return formatAuction(
      row,
      new Date(row.db_now).toISOString(),
      countRes.rows[0].cnt
    );
  } catch (err) {
    if (inTx) {
      await client.query('ROLLBACK').catch(() => {});
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Permitted host lifecycle close:
 * Atomically closes a LIVE auction under FOR UPDATE lock.
 * Winner is ALWAYS computed strictly as highest_bidder_id by the database —
 * host can NEVER choose a winner or rewrite results.
 */
async function closeHostAuction(hostUser, auctionId, io = null) {
  if (!isValidUuid(auctionId)) {
    throw new AppError(400, 'INVALID_AUCTION_ID', 'Invalid auction ID format.');
  }

  const client = await pool.connect();
  let inTx = false;
  try {
    await client.query('BEGIN');
    inTx = true;

    const existingRes = await client.query(
      'SELECT * FROM auctions WHERE id = $1 FOR UPDATE',
      [auctionId]
    );
    if (existingRes.rows.length === 0) {
      throw new AppError(404, 'AUCTION_NOT_FOUND', 'Auction not found.');
    }
    const existing = existingRes.rows[0];

    if (hostUser.role !== 'ADMIN' && existing.host_user_id !== hostUser.id) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'You do not have permission to close this auction.'
      );
    }
    if (existing.status === 'CLOSED') {
      throw new AppError(409, 'ALREADY_CLOSED', 'Auction is already closed.');
    }

    const updatedRes = await client.query(
      `UPDATE auctions
       SET
         status = 'CLOSED',
         winner_id = highest_bidder_id,
         closed_at = clock_timestamp(),
         version = version + 1,
         updated_at = clock_timestamp()
       WHERE id = $1
       RETURNING *, clock_timestamp() AS db_now`,
      [auctionId]
    );

    const countRes = await client.query(
      'SELECT COUNT(*)::int AS cnt FROM bids WHERE auction_id = $1',
      [auctionId]
    );

    await client.query('COMMIT');
    inTx = false;

    const closedRow = updatedRes.rows[0];
    const bidCount = countRes.rows[0].cnt;
    const serverTimeIso = new Date(closedRow.db_now).toISOString();
    const formatted = formatAuction(closedRow, serverTimeIso, bidCount);

    if (io) {
      emitAuctionClosed(io, {
        auction: formatted,
        hadBids: bidCount > 0,
        serverTime: serverTimeIso,
      });
    }

    return formatted;
  } catch (err) {
    if (inTx) {
      await client.query('ROLLBACK').catch(() => {});
    }
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  createHostAuction,
  listHostAuctions,
  getHostAuctionById,
  updateHostAuction,
  startHostAuction,
  closeHostAuction,
};
