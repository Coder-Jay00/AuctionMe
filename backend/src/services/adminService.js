const { pool } = require('../config/db');
const { AppError, isValidUuid, formatAuction } = require('./helpers');
const { formatUser } = require('./authService');

const VALID_ROLES = ['BIDDER', 'HOST', 'ADMIN'];
const VALID_MODERATION_STATUSES = ['APPROVED', 'FLAGGED', 'SUSPENDED'];
const VALID_COMPLAINT_STATUSES = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'];

async function recordAuditLog(actorUserId, action, targetType, targetId, details = null) {
  await pool.query(
    `INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [actorUserId, action, targetType, String(targetId), details ? JSON.stringify(details) : null]
  );
}

async function listUsers() {
  const res = await pool.query(
    `SELECT id, auction_me_id, display_name, role, is_active, created_at
     FROM users
     ORDER BY created_at DESC`
  );
  return res.rows.map(formatUser);
}

async function updateUserRole(adminUser, targetUserId, role) {
  if (!isValidUuid(targetUserId)) {
    throw new AppError(400, 'INVALID_USER_ID', 'Invalid user ID format.');
  }
  if (!VALID_ROLES.includes(role)) {
    throw new AppError(
      400,
      'INVALID_ROLE',
      `Role must be one of: ${VALID_ROLES.join(', ')}.`
    );
  }
  if (adminUser.id === targetUserId && role !== 'ADMIN') {
    throw new AppError(
      400,
      'CANNOT_DEMOTE_SELF',
      'Administrators cannot remove their own ADMIN role.'
    );
  }

  const res = await pool.query(
    `UPDATE users
     SET role = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING id, auction_me_id, display_name, role, is_active, created_at`,
    [targetUserId, role]
  );

  if (res.rows.length === 0) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
  }

  const updated = formatUser(res.rows[0]);
  await recordAuditLog(adminUser.id, 'USER_ROLE_UPDATED', 'USER', targetUserId, {
    newRole: role,
    auctionMeId: updated.auctionMeId,
  });

  return updated;
}

async function updateUserStatus(adminUser, targetUserId, isActive) {
  if (!isValidUuid(targetUserId)) {
    throw new AppError(400, 'INVALID_USER_ID', 'Invalid user ID format.');
  }
  if (typeof isActive !== 'boolean') {
    throw new AppError(400, 'INVALID_STATUS', 'isActive must be a boolean.');
  }
  if (adminUser.id === targetUserId && !isActive) {
    throw new AppError(
      400,
      'CANNOT_DEACTIVATE_SELF',
      'Administrators cannot deactivate their own account.'
    );
  }

  const res = await pool.query(
    `UPDATE users
     SET is_active = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING id, auction_me_id, display_name, role, is_active, created_at`,
    [targetUserId, isActive]
  );

  if (res.rows.length === 0) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
  }

  // Immediately revoke all active sessions when deactivating a user
  if (!isActive) {
    await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [
      targetUserId,
    ]);
  }

  const updated = formatUser(res.rows[0]);
  await recordAuditLog(
    adminUser.id,
    isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    'USER',
    targetUserId,
    { auctionMeId: updated.auctionMeId }
  );

  return updated;
}

async function listAllAuctionsForAdmin() {
  const res = await pool.query(
    `SELECT a.*, u.display_name AS host_display_name, u.auction_me_id AS host_auction_me_id,
            clock_timestamp() AS db_now,
            (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) AS bid_count
     FROM auctions a
     LEFT JOIN users u ON u.id = a.host_user_id
     ORDER BY a.created_at DESC`
  );
  return res.rows.map((row) =>
    formatAuction(row, new Date(row.db_now).toISOString(), row.bid_count)
  );
}

async function moderateAuction(adminUser, auctionId, { moderationStatus, moderationNote }) {
  if (!isValidUuid(auctionId)) {
    throw new AppError(400, 'INVALID_AUCTION_ID', 'Invalid auction ID format.');
  }
  if (!VALID_MODERATION_STATUSES.includes(moderationStatus)) {
    throw new AppError(
      400,
      'INVALID_MODERATION_STATUS',
      `moderationStatus must be one of: ${VALID_MODERATION_STATUSES.join(', ')}.`
    );
  }

  const note =
    typeof moderationNote === 'string' ? moderationNote.trim().slice(0, 1000) : null;

  const res = await pool.query(
    `UPDATE auctions
     SET
       moderation_status = $2,
       moderation_note = $3,
       version = version + 1,
       updated_at = clock_timestamp()
     WHERE id = $1
     RETURNING *, clock_timestamp() AS db_now,
       (SELECT COUNT(*) FROM bids b WHERE b.auction_id = auctions.id) AS bid_count`,
    [auctionId, moderationStatus, note]
  );

  if (res.rows.length === 0) {
    throw new AppError(404, 'AUCTION_NOT_FOUND', 'Auction not found.');
  }

  await recordAuditLog(adminUser.id, 'AUCTION_MODERATED', 'AUCTION', auctionId, {
    moderationStatus,
    moderationNote: note,
  });

  const row = res.rows[0];
  return formatAuction(row, new Date(row.db_now).toISOString(), row.bid_count);
}

async function listAuditLogs(limit = 100) {
  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 100, 1), 200);
  const res = await pool.query(
    `SELECT l.id, l.actor_user_id, u.auction_me_id AS actor_auction_me_id,
            l.action, l.target_type, l.target_id, l.details, l.created_at
     FROM audit_logs l
     LEFT JOIN users u ON u.id = l.actor_user_id
     ORDER BY l.created_at DESC
     LIMIT $1`,
    [safeLimit]
  );

  return res.rows.map((row) => ({
    id: row.id,
    actorUserId: row.actor_user_id,
    actorAuctionMeId: row.actor_auction_me_id || null,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    details: row.details || null,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

async function listComplaints(limit = 100) {
  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 100, 1), 200);
  const res = await pool.query(
    `SELECT c.*, u.auction_me_id AS reporter_auction_me_id, u.display_name AS reporter_name,
            a.title AS auction_title
     FROM complaints c
     INNER JOIN users u ON u.id = c.reporter_user_id
     LEFT JOIN auctions a ON a.id = c.auction_id
     ORDER BY c.created_at DESC
     LIMIT $1`,
    [safeLimit]
  );
  return res.rows.map((row) => ({
    id: row.id,
    reporterUserId: row.reporter_user_id,
    reporterAuctionMeId: row.reporter_auction_me_id,
    reporterName: row.reporter_name,
    auctionId: row.auction_id,
    auctionTitle: row.auction_title || null,
    subject: row.subject,
    description: row.description,
    status: row.status,
    resolutionNote: row.resolution_note || null,
    resolvedBy: row.resolved_by || null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }));
}

async function updateComplaint(adminUser, complaintId, { status, resolutionNote }) {
  if (!isValidUuid(complaintId)) {
    throw new AppError(400, 'INVALID_COMPLAINT_ID', 'Invalid complaint ID format.');
  }
  if (!VALID_COMPLAINT_STATUSES.includes(status)) {
    throw new AppError(
      400,
      'INVALID_COMPLAINT_STATUS',
      `status must be one of: ${VALID_COMPLAINT_STATUSES.join(', ')}.`
    );
  }
  const note =
    typeof resolutionNote === 'string' ? resolutionNote.trim().slice(0, 1000) : null;
  const res = await pool.query(
    `UPDATE complaints
     SET status = $2,
         resolution_note = $3,
         resolved_by = $4,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [complaintId, status, note, adminUser.id]
  );
  if (res.rows.length === 0) {
    throw new AppError(404, 'COMPLAINT_NOT_FOUND', 'Complaint not found.');
  }
  await recordAuditLog(adminUser.id, 'COMPLAINT_UPDATED', 'COMPLAINT', complaintId, {
    status,
    resolutionNote: note,
  });
  return res.rows[0];
}

module.exports = {
  listUsers,
  updateUserRole,
  updateUserStatus,
  listAllAuctionsForAdmin,
  moderateAuction,
  listAuditLogs,
  listComplaints,
  updateComplaint,
};
