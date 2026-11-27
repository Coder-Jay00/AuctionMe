const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Calls POST /api/auth/login on the Express backend.
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
  } catch {
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
    err.code = data?.error?.code || 'INVALID_CREDENTIALS';
    err.status = response.status;
    throw err;
  }

  const err = new Error(
    data?.error?.message || 'Unable to connect. Please try again.'
  );
  err.code = data?.error?.code || 'SERVER_UNAVAILABLE';
  err.status = response.status;
  throw err;
}

/**
 * Calls POST /api/auth/register on the Express backend.
 */
export async function registerWithAuctionMeId({
  displayName,
  auctionMeId,
  password,
}) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        displayName: displayName.trim(),
        auctionMeId: auctionMeId.trim(),
        password,
      }),
    });
  } catch {
    const err = new Error('Unable to connect. Please try again.');
    err.code = 'SERVER_UNAVAILABLE';
    throw err;
  }

  const data = await response.json().catch(() => ({}));

  if (response.ok) {
    return data;
  }

  const err = new Error(
    data?.error?.message || 'Unable to create account. Please try again.'
  );
  err.code = data?.error?.code || 'REGISTRATION_FAILED';
  err.status = response.status;
  throw err;
}

/**
 * Fetches the currently authenticated user from GET /api/auth/me.
 * Returns null if unauthenticated (401).
 */
export async function fetchCurrentUser() {
  try {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      cache: 'no-store',
      credentials: 'include',
    });
    if (!response.ok) return null;
    const data = await response.json().catch(() => ({}));
    return data.user || null;
  } catch {
    return null;
  }
}

/**
 * Calls POST /api/auth/logout to revoke the current session cookie.
 */
export async function logoutSession() {
  await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => {});
}
