/**
 * server/routes/contacts.js  (Task 6)
 * ────────────────────────────────────────────────────────
 * Handles device contacts uploaded from the mobile app
 * (sent by src/services/api.js — Task 5).
 *
 * Routes:
 *   POST /api/uploadContacts           — save contacts for a user
 *   GET  /api/uploadContacts           — list all records (admin)
 *   GET  /api/uploadContacts/:userId   — get contacts for one user (admin)
 * ────────────────────────────────────────────────────────
 */

const express = require('express');
const {
  uploadContacts,
  getContactsByUser,
  getAllContactRecords,
} = require('../controllers/contactsController');
const { protect }     = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

// All routes require a valid JWT
router.use(protect);

/**
 * POST /api/uploadContacts
 *
 * Called by the mobile app (api.js) after fetching device contacts.
 * Any authenticated user can upload their own contacts.
 * Admin can upload on behalf of any userId.
 *
 * Body:
 *   { userId: "string", contacts: [{ name, phone, email, avatar }] }
 *
 * Response:
 *   { success, message, userId, totalSaved, lastUpdated }
 */
router.post('/', uploadContacts);

/**
 * GET /api/uploadContacts
 * Admin only — list all users who have uploaded contacts + counts
 */
router.get('/', requireRole('admin'), getAllContactRecords);

/**
 * Task 7 — GET /api/uploadContacts/getContactsByUser?userId=XYZ
 * Admin only — returns all contacts for a specific user by userId query param.
 * Must be defined BEFORE the /:userId param route so Express matches it first.
 */
router.get('/getContactsByUser', requireRole('admin'), async (req, res, next) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId query param is required. Usage: /api/uploadContacts/getContactsByUser?userId=XYZ' });
    }
    // Delegate to the existing controller by injecting userId into params
    req.params.userId = userId.trim().toLowerCase();
    return getContactsByUser(req, res, next);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/uploadContacts/:userId
 * Admin only — retrieve full contacts array for a specific user by path param
 */
router.get('/:userId', requireRole('admin'), getContactsByUser);

module.exports = router;
