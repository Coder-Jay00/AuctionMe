const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Calls the Express backend authentication endpoint.
 * Never simulates a successful login — surfaces exact backend status.
 */
export async function loginWithAuctionMeId({
  auctionMeId,
  password,
  rememberMe,
}) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        auctionMeId: auctionMeId.trim(),
        password,
        rememberMe: Boolean(rememberMe),
      }),
    });
  } catch (networkErr) {
    const err = new Error('Unable to connect. Please try again.');
    err.code = 'SERVER_UNAVAILABLE';
    throw err;
  }

  const data = await response.json().catch(() => ({}));

  if (response.ok) {
    return data;
  }

  if (response.status === 401 || response.status === 403) {
    const err = new Error(
      data?.error?.message || 'Invalid AuctionMe ID or password.'
    );
    err.code = 'INVALID_CREDENTIALS';
    err.status = response.status;
    throw err;
  }

  if (response.status === 404) {
    const err = new Error(
      'Unable to sign in: backend authentication endpoint (/api/auth/login) is not implemented yet.'
    );
    err.code = 'AUTH_NOT_IMPLEMENTED';
    err.status = 404;
    throw err;
  }

  const err = new Error(
    data?.error?.message || 'Unable to connect. Please try again.'
  );
  err.code = 'SERVER_UNAVAILABLE';
  err.status = response.status;
  throw err;
}
