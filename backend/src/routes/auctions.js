const express = require('express');
const {
  listAuctions,
  getAuctionById,
  getAuctionBids,
  getAuctionResult,
} = require('../services/auctionService');
const { placeBid } = require('../services/biddingService');
const {
  emitAuctionUpdate,
  emitBidRejected,
} = require('../sockets/auctionSocket');
const { AppError } = require('../services/helpers');
const { requireAuth, requireRole } = require('../middleware/auth');

function createAuctionRouter(getIo) {
  const router = express.Router();

  // List auctions (helps frontend discover the active demo auction automatically)
  router.get('/', async (req, res, next) => {
    try {
      const auctions = await listAuctions();
      res.json({ auctions });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/auctions/:id
  router.get('/:id', async (req, res, next) => {
    try {
      const auction = await getAuctionById(req.params.id);
      res.json({ auction });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/auctions/:id/bids
  router.get('/:id/bids', async (req, res, next) => {
    try {
      const bids = await getAuctionBids(req.params.id, req.query.limit);
      res.json({ bids });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/auctions/:id/result
  router.get('/:id/result', async (req, res, next) => {
    try {
      const result = await getAuctionResult(req.params.id);
      res.json({ result });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/auctions/:id/bids (Authenticated BIDDER only; bidderId derived strictly from session)
  router.post('/:id/bids', requireAuth, requireRole('BIDDER'), async (req, res, next) => {
    const { amount, requestId, socketId } = req.body || {};
    const bidderId = req.user.auctionMeId;
    const auctionId = req.params.id;
    const io = typeof getIo === 'function' ? getIo() : null;

    try {
      const outcome = await placeBid({
        auctionId,
        bidderId,
        amount,
        requestId,
        actorUserId: req.user.id,
      });

      // Only broadcast AFTER commit and only for newly committed bids (not idempotent replays)
      if (io && !outcome.idempotentReplay) {
        emitAuctionUpdate(io, outcome);
      }

      const statusCode = outcome.idempotentReplay ? 200 : 201;
      res.status(statusCode).json({
        accepted: true,
        idempotentReplay: outcome.idempotentReplay,
        extended: outcome.extended,
        extensionSeconds: outcome.extensionSeconds,
        bid: outcome.bid,
        auction: outcome.auction,
        serverTime: outcome.serverTime,
      });
    } catch (err) {
      if (io && err instanceof AppError) {
        emitBidRejected(io, {
          auctionId,
          socketId,
          bidderId,
          requestId,
          code: err.code,
          message: err.message,
          details: err.details,
        });
      }
      next(err);
    }
  });

  return router;
}

module.exports = { createAuctionRouter };
