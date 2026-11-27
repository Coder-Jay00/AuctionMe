const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getMyBids,
  getMyHoldings,
  getMyWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} = require('../services/bidderService');

function createMeRouter() {
  const router = express.Router();

  router.use(requireAuth);

  // GET /api/me/bids
  router.get('/bids', async (req, res, next) => {
    try {
      const data = await getMyBids(req.user, req.query.limit);
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/me/holdings
  router.get('/holdings', async (req, res, next) => {
    try {
      const data = await getMyHoldings(req.user);
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/me/watchlist
  router.get('/watchlist', async (req, res, next) => {
    try {
      const data = await getMyWatchlist(req.user);
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/me/watchlist/:auctionId
  router.post('/watchlist/:auctionId', async (req, res, next) => {
    try {
      const data = await addToWatchlist(req.user, req.params.auctionId);
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/me/watchlist/:auctionId
  router.delete('/watchlist/:auctionId', async (req, res, next) => {
    try {
      const data = await removeFromWatchlist(req.user, req.params.auctionId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createMeRouter };
