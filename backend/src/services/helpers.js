class AppError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value) {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

function formatAuction(row, serverTimeIso, bidCount = undefined) {
  const currentPrice = Number(row.current_price);
  const minIncrement = Number(row.min_increment);
  const result = {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    startingPrice: Number(row.starting_price),
    currentPrice,
    minIncrement,
    minNextBid: currentPrice + minIncrement,
    highestBidderId: row.highest_bidder_id,
    winnerId: row.winner_id,
    startsAt: new Date(row.starts_at).toISOString(),
    endsAt: new Date(row.ends_at).toISOString(),
    closedAt: row.closed_at ? new Date(row.closed_at).toISOString() : null,
    version: Number(row.version),
    createdAt: new Date(row.created_at).toISOString(),
    hostUserId: row.host_user_id || null,
    hostName: row.host_display_name || row.host_auction_me_id || null,
    category: row.category || null,
    imageUrl: row.image_url || null,
    moderationStatus: row.moderation_status || 'APPROVED',
    moderationNote: row.moderation_note || null,
  };
  if (serverTimeIso) {
    result.serverTime = serverTimeIso;
  }
  if (bidCount !== undefined) {
    result.bidCount = Number(bidCount);
  }
  return result;
}

function formatBid(row) {
  return {
    id: row.id,
    auctionId: row.auction_id,
    bidderId: row.bidder_id,
    amount: Number(row.amount),
    requestId: row.request_id,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

module.exports = {
  AppError,
  isValidUuid,
  formatAuction,
  formatBid,
};
