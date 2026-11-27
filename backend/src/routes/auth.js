const express = require('express');
const config = require('../config/env');
const {
  SESSION_COOKIE_NAME,
  checkAuctionMeIdAvailable,
  registerUser,
  loginUser,
  revokeSessionToken,
} = require('../services/authService');
const { requireAuth, extractSessionToken } = require('../middleware/auth');

function setSessionCookie(res, token, maxAgeMs) {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    path: '/',
    maxAge: maxAgeMs,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    path: '/',
  });
}

function createAuthRouter() {
  const router = express.Router();

  // GET /api/auth/check-id?auctionMeId=...
  router.get('/check-id', async (req, res, next) => {
    try {
      const result = await checkAuctionMeIdAvailable(req.query.auctionMeId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/auth/register
  router.post('/register', async (req, res, next) => {
    try {
      const { displayName, auctionMeId, password } = req.body || {};
      const { user, session } = await registerUser({
        displayName,
        auctionMeId,
        password,
      });
      setSessionCookie(res, session.token, session.maxAgeMs);
      res.status(201).json({
        user,
        token: session.token,
        expiresAt: session.expiresAt.toISOString(),
      });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/auth/login
  router.post('/login', async (req, res, next) => {
    try {
      const { auctionMeId, password, rememberMe } = req.body || {};
      const { user, session } = await loginUser({
        auctionMeId,
        password,
        rememberMe,
      });
      setSessionCookie(res, session.token, session.maxAgeMs);
      res.json({
        user,
        token: session.token,
        expiresAt: session.expiresAt.toISOString(),
      });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/auth/logout
  router.post('/logout', async (req, res, next) => {
    try {
      const token = extractSessionToken(req);
      if (token) {
        await revokeSessionToken(token);
      }
      clearSessionCookie(res);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/auth/me
  router.get('/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  return router;
}

module.exports = { createAuthRouter };
