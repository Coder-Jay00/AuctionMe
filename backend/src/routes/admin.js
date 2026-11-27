const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  listUsers,
  updateUserRole,
  updateUserStatus,
  listAllAuctionsForAdmin,
  moderateAuction,
  listAuditLogs,
  listComplaints,
  updateComplaint,
} = require('../services/adminService');

function createAdminRouter() {
  const router = express.Router();

  router.use(requireAuth, requireRole('ADMIN'));

  // GET /api/admin/users
  router.get('/users', async (req, res, next) => {
    try {
      const users = await listUsers();
      res.json({ users });
    } catch (err) {
      next(err);
    }
  });

  // PATCH /api/admin/users/:id/role
  router.patch('/users/:id/role', async (req, res, next) => {
    try {
      const { role } = req.body || {};
      const user = await updateUserRole(req.user, req.params.id, role);
      res.json({ user });
    } catch (err) {
      next(err);
    }
  });

  // PATCH /api/admin/users/:id/status
  router.patch('/users/:id/status', async (req, res, next) => {
    try {
      const { isActive } = req.body || {};
      const user = await updateUserStatus(req.user, req.params.id, isActive);
      res.json({ user });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/admin/auctions
  router.get('/auctions', async (req, res, next) => {
    try {
      const auctions = await listAllAuctionsForAdmin();
      res.json({ auctions });
    } catch (err) {
      next(err);
    }
  });

  // PATCH /api/admin/auctions/:id/moderate
  router.patch('/auctions/:id/moderate', async (req, res, next) => {
    try {
      const { moderationStatus, moderationNote } = req.body || {};
      const auction = await moderateAuction(req.user, req.params.id, {
        moderationStatus,
        moderationNote,
      });
      res.json({ auction });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/admin/audit-logs
  router.get('/audit-logs', async (req, res, next) => {
    try {
      const logs = await listAuditLogs(req.query.limit);
      res.json({ logs });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/admin/complaints
  router.get('/complaints', async (req, res, next) => {
    try {
      const complaints = await listComplaints(req.query.limit);
      res.json({ complaints });
    } catch (err) {
      next(err);
    }
  });

  // PATCH /api/admin/complaints/:id
  router.patch('/complaints/:id', async (req, res, next) => {
    try {
      const { status, resolutionNote } = req.body || {};
      const complaint = await updateComplaint(req.user, req.params.id, {
        status,
        resolutionNote,
      });
      res.json({ complaint });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createAdminRouter };
