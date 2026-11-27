const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function parseResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      data?.error?.message || `Request failed with status ${res.status}`
    );
    err.status = res.status;
    err.code = data?.error?.code || 'REQUEST_FAILED';
    err.details = data?.error?.details || null;
    throw err;
  }
  return data;
}

export async function fetchAuctions() {
  const res = await fetch(`${API_BASE}/api/auctions`, { cache: 'no-store' });
  return parseResponse(res);
}

export async function fetchAuction(auctionId) {
  const res = await fetch(`${API_BASE}/api/auctions/${auctionId}`, {
    cache: 'no-store',
  });
  return parseResponse(res);
}

export async function fetchAuctionBids(auctionId, limit = 50) {
  const res = await fetch(
    `${API_BASE}/api/auctions/${auctionId}/bids?limit=${limit}`,
    { cache: 'no-store' }
  );
  return parseResponse(res);
}

export async function fetchAuctionResult(auctionId) {
  const res = await fetch(`${API_BASE}/api/auctions/${auctionId}/result`, {
    cache: 'no-store',
  });
  return parseResponse(res);
}

export async function submitBid(auctionId, { bidderId, amount, requestId, socketId }) {
  const res = await fetch(`${API_BASE}/api/auctions/${auctionId}/bids`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ bidderId, amount, requestId, socketId }),
  });
  return parseResponse(res);
}

export async function fetchMyBids(limit = 100) {
  const res = await fetch(`${API_BASE}/api/me/bids?limit=${limit}`, {
    cache: 'no-store',
    credentials: 'include',
  });
  return parseResponse(res);
}

export async function fetchWatchlist() {
  const res = await fetch(`${API_BASE}/api/me/watchlist`, {
    cache: 'no-store',
    credentials: 'include',
  });
  return parseResponse(res);
}

export async function addToWatchlist(auctionId) {
  const res = await fetch(`${API_BASE}/api/me/watchlist/${auctionId}`, {
    method: 'POST',
    credentials: 'include',
  });
  return parseResponse(res);
}

export async function removeFromWatchlist(auctionId) {
  const res = await fetch(`${API_BASE}/api/me/watchlist/${auctionId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return parseResponse(res);
}

export async function fetchHostAuctions() {
  const res = await fetch(`${API_BASE}/api/host/auctions`, {
    cache: 'no-store',
    credentials: 'include',
  });
  return parseResponse(res);
}

/**
 * Queries the bidder-specific holdings endpoint if available on the backend.
 * Returns { available: true, data } when implemented, or
 * { available: false, reason, status } when the endpoint is missing (404)
 * or requires authentication (401/403). Network/5xx errors are thrown so the
 * caller can render the error/retry state.
 */
export async function fetchBidderHoldings() {
  const res = await fetch(`${API_BASE}/api/me/holdings`, {
    cache: 'no-store',
    credentials: 'include',
  });

  if (res.status === 404) {
    return {
      available: false,
      reason: 'ENDPOINT_NOT_IMPLEMENTED',
      status: 404,
      message:
        'Bidder holdings endpoint (GET /api/me/holdings) is not implemented on the backend yet.',
    };
  }

  if (res.status === 401 || res.status === 403) {
    return {
      available: false,
      reason: 'UNAUTHENTICATED',
      status: res.status,
      message: 'Sign in with an authenticated bidder account to view your holdings.',
    };
  }

  const data = await parseResponse(res);
  return {
    available: true,
    data,
  };
}
