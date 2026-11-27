const {
  SESSION_COOKIE_NAME,
  getUserBySessionToken,
} = require('../services/authService');
const { AppError } = require('../services/helpers');

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') {
    return cookies;
  }
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) {
      cookies[key] = decodeURIComponent(val);
    }
  }
  return cookies;
}

function extractSessionToken(req) {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE_NAME] || null;
}

async function attachUser(req, res, next) {
  try {
    const token = extractSessionToken(req);
    if (!token) {
      req.user = null;
      req.sessionToken = null;
      return next();
    }
    const user = await getUserBySessionToken(token);
    req.user = user;
    req.sessionToken = user ? token : null;
    return next();
  } catch (err) {
    return next(err);
  }
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return next(
      new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.')
    );
  }
  return next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.')
      );
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          'FORBIDDEN',
          `Access denied. Required role: ${allowedRoles.join(' or ')}.`
        )
      );
    }
    return next();
  };
}

module.exports = {
  extractSessionToken,
  attachUser,
  requireAuth,
  requireRole,
};
