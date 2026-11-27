const { pool } = require('../config/db');
const { formatAuction } = require('./helpers');
const { emitAuctionClosed } = require('../sockets/auctionSocket');

/**
 * Atomically closes all LIVE auctions whose ends_at <= clock_timestamp().
 * Uses FOR UPDATE SKIP LOCKED to safely run concurrently with bidding
 * transactions and multiple worker instances.
 */
async function closeExpiredAuctions(io = null) {
  const client = await pool.connect();
  let inTransaction = false;
  const closedResults = [];

  try {
    await client.query('BEGIN');
    inTransaction = true;

    // Lock expired LIVE auctions without blocking on rows currently locked by active bids
    const candidatesRes = await client.query(
      `SELECT id
       FROM auctions
       WHERE status = 'LIVE'
         AND ends_at <= clock_timestamp()
       FOR UPDATE SKIP LOCKED`
    );

    for (const candidate of candidatesRes.rows) {
      // Re-verify status and authoritative deadline after lock acquisition and atomically close
      const updateRes = await client.query(
        `UPDATE auctions
         SET
           status = 'CLOSED',
           winner_id = highest_bidder_id,
           closed_at = clock_timestamp(),
           version = version + 1
         WHERE id = $1
           AND status = 'LIVE'
           AND ends_at <= clock_timestamp()
         RETURNING *, clock_timestamp() AS db_now`,
        [candidate.id]
      );

      if (updateRes.rows.length > 0) {
        const closedRow = updateRes.rows[0];
        const countRes = await client.query(
          'SELECT COUNT(*) AS bid_count FROM bids WHERE auction_id = $1',
          [closedRow.id]
        );
        const bidCount = Number(countRes.rows[0].bid_count);
        const serverTimeIso = new Date(closedRow.db_now).toISOString();

        closedResults.push({
          auction: formatAuction(closedRow, serverTimeIso, bidCount),
          hadBids: bidCount > 0,
          serverTime: serverTimeIso,
        });
      }
    }

    await client.query('COMMIT');
    inTransaction = false;

    // Broadcast ONLY after transaction commit
    if (io && closedResults.length > 0) {
      for (const item of closedResults) {
        emitAuctionClosed(io, item);
      }
    }

    return closedResults;
  } catch (err) {
    if (inTransaction) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('[ClosingService] Rollback error:', rollbackErr.message);
      }
    }
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { closeExpiredAuctions };
