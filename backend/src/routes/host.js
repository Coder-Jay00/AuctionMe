const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  createHostAuction,
  listHostAuctions,
  getHostAuctionById,
  updateHostAuction,
  startHostAuction,
  closeHostAuction,
} = require('../services/hostService');

function createHostRouter(getIo) {
  const router = express.Router();

  router.use(requireAuth, requireRole('HOST', 'ADMIN'));

  // POST /api/host/auctions
  router.post('/auctions', async (req, res, next) => {
    try {
      const auction = await createHostAuction(req.user, req.body || {});
      res.status(201).json({ auction });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/host/auctions
  router.get('/auctions', async (req, res, next) => {
    try {
      const auctions = await listHostAuctions(req.user);
      res.json({ auctions });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/host/auctions/:id
  router.get('/auctions/:id', async (req, res, next) => {
    try {
      const auction = await getHostAuctionById(req.user, req.params.id);
      res.json({ auction });
    } catch (err) {
      next(err);
    }
  });

  // PATCH /api/host/auctions/:id
  router.patch('/auctions/:id', async (req, res, next) => {
    try {
      const auction = await updateHostAuction(
        req.user,
        req.params.id,
        req.body || {}
      );
      res.json({ auction });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/host/auctions/:id/start
  router.post('/auctions/:id/start', async (req, res, next) => {
    try {
      const auction = await startHostAuction(req.user, req.params.id);
      res.json({ auction });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/host/auctions/:id/close
  router.post('/auctions/:id/close', async (req, res, next) => {
    try {
      const io = typeof getIo === 'function' ? getIo() : null;
      const auction = await closeHostAuction(req.user, req.params.id, io);
      res.json({ auction });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createHostRouter };
