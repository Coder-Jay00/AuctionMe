const crypto = require('crypto');
const { pool } = require('../config/db');
const { AppError } = require('./helpers');

const SESSION_COOKIE_NAME = 'auctionme_session';
const SHORT_SESSION_MS = 24 * 60 * 60 * 1000; // 24 hours
const LONG_SESSION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const AUCTION_ME_ID_REGEX = /^[a-zA-Z0-9._-]{3,40}$/;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password, storedHash) {
  if (typeof password !== 'string' || typeof storedHash !== 'string') {
    return false;
  }
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }
  const [, salt, keyHex] = parts;
  const expectedBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, expectedBuf.length);
  if (expectedBuf.length !== derivedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, derivedBuf);
}

function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function formatUser(row) {
  return {
    id: row.id,
    auctionMeId: row.auction_me_id,
    displayName: row.display_name,
    role: row.role,
    isActive: Boolean(row.is_active),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function validatePasswordStrength(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new AppError(
      400,
      'WEAK_PASSWORD',
      'Password must be at least 8 characters long.'
    );
  }
  if (password.length > 128) {
    throw new AppError(
      400,
      'INVALID_PASSWORD',
      'Password must be at most 128 characters long.'
    );
  }
}

async function createSession(userId, rememberMe = false) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(token);
  const ttlMs = rememberMe ? LONG_SESSION_MS : SHORT_SESSION_MS;
  const expiresAt = new Date(Date.now() + ttlMs);

  await pool.query(
    `INSERT INTO user_sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt.toISOString()]
  );

  return { token, expiresAt, maxAgeMs: ttlMs };
}

async function checkAuctionMeIdAvailable(auctionMeId) {
  const trimmed = typeof auctionMeId === 'string' ? auctionMeId.trim() : '';
  if (!AUCTION_ME_ID_REGEX.test(trimmed)) {
    throw new AppError(
      400,
      'INVALID_AUCTION_ME_ID',
      'AuctionMe ID must be 3–40 characters using letters, numbers, dots, hyphens, or underscores.'
    );
  }
  const res = await pool.query(
    'SELECT id FROM users WHERE LOWER(auction_me_id) = LOWER($1)',
    [trimmed]
  );
  return { auctionMeId: trimmed, available: res.rows.length === 0 };
}

async function registerUser({ displayName, auctionMeId, password }) {
  const trimmedName = typeof displayName === 'string' ? displayName.trim() : '';
  const trimmedId = typeof auctionMeId === 'string' ? auctionMeId.trim() : '';

  if (trimmedName.length < 2 || trimmedName.length > 100) {
    throw new AppError(
      400,
      'INVALID_DISPLAY_NAME',
      'Display name must be between 2 and 100 characters.'
    );
  }
  if (!AUCTION_ME_ID_REGEX.test(trimmedId)) {
    throw new AppError(
      400,
      'INVALID_AUCTION_ME_ID',
      'AuctionMe ID must be 3–40 characters using letters, numbers, dots, hyphens, or underscores.'
    );
  }
  validatePasswordStrength(password);

  const passwordHash = hashPassword(password);

  try {
    // Public registration ALWAYS assigns BIDDER role — never trusts client-supplied role.
    const res = await pool.query(
      `INSERT INTO users (auction_me_id, display_name, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'BIDDER', TRUE)
       RETURNING id, auction_me_id, display_name, role, is_active, created_at`,
      [trimmedId, trimmedName, passwordHash]
    );
    const user = formatUser(res.rows[0]);
    const session = await createSession(user.id, false);
    return { user, session };
  } catch (err) {
    if (err && err.code === '23505') {
      throw new AppError(
        409,
        'AUCTION_ME_ID_TAKEN',
        'That AuctionMe ID is already registered.'
      );
    }
    throw err;
  }
}

async function loginUser({ auctionMeId, password, rememberMe = false }) {
  const trimmedId = typeof auctionMeId === 'string' ? auctionMeId.trim() : '';
  if (!trimmedId || typeof password !== 'string' || password.length === 0) {
    throw new AppError(
      400,
      'MISSING_CREDENTIALS',
      'AuctionMe ID and password are required.'
    );
  }

  const res = await pool.query(
    `SELECT id, auction_me_id, display_name, password_hash, role, is_active, created_at
     FROM users
     WHERE LOWER(auction_me_id) = LOWER($1)`,
    [trimmedId]
  );

  if (res.rows.length === 0) {
    throw new AppError(
      401,
      'INVALID_CREDENTIALS',
      'Invalid AuctionMe ID or password.'
    );
  }

  const row = res.rows[0];
  const valid = verifyPassword(password, row.password_hash);
  if (!valid) {
    throw new AppError(
      401,
      'INVALID_CREDENTIALS',
      'Invalid AuctionMe ID or password.'
    );
  }

  if (!row.is_active) {
    throw new AppError(
      403,
      'ACCOUNT_DISABLED',
      'This account has been deactivated by an administrator.'
    );
  }

  const user = formatUser(row);
  const session = await createSession(user.id, Boolean(rememberMe));
  return { user, session };
}

async function getUserBySessionToken(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }
  const tokenHash = hashSessionToken(token);
  const res = await pool.query(
    `SELECT u.id, u.auction_me_id, u.display_name, u.role, u.is_active, u.created_at,
            s.id AS session_id, s.expires_at
     FROM user_sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.expires_at > NOW()`,
    [tokenHash]
  );

  if (res.rows.length === 0) {
    return null;
  }

  const row = res.rows[0];
  if (!row.is_active) {
    return null;
  }

  return formatUser(row);
}

async function revokeSessionToken(token) {
  if (!token || typeof token !== 'string') return;
  const tokenHash = hashSessionToken(token);
  await pool.query('DELETE FROM user_sessions WHERE token_hash = $1', [
    tokenHash,
  ]);
}

module.exports = {
  SESSION_COOKIE_NAME,
  hashPassword,
  verifyPassword,
  formatUser,
  checkAuctionMeIdAvailable,
  registerUser,
  loginUser,
  getUserBySessionToken,
  revokeSessionToken,
};
