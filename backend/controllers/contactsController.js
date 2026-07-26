const asyncHandler = require('express-async-handler');
const Contact      = require('../models/Contact');
const User         = require('../models/User');

/**
 * POST /api/uploadContacts
 *
 * Task 6 — Accepts userId + contacts array from the mobile app
 * (sent by src/services/api.js) and saves/updates them in MongoDB.
 *
 * Body:
 *  {
 *    userId:   "user123",
 *    contacts: [
 *      { name, phone, email, avatar },
 *      ...
 *    ]
 *  }
 *
 * Strategy: upsert — if a document for this user already exists,
 * replace its contacts array. Otherwise create a new document.
 * This keeps storage lean (one document per user, not one per upload).
 */
const uploadContacts = asyncHandler(async (req, res) => {
  const { userId, contacts } = req.body;

  // ── Validate inputs ────────────────────────────────────────────
  if (!userId) {
    res.status(400); throw new Error('userId is required');
  }
  if (!Array.isArray(contacts)) {
    res.status(400); throw new Error('contacts must be an array');
  }

  // ── Verify the userId belongs to the authenticated user ────────
  // Prevents a user from uploading contacts under another user's ID
  if (req.user.userId !== userId && req.user.role !== 'admin') {
    res.status(403); throw new Error('You can only upload your own contacts');
  }

  // ── Find the User document for the given userId ────────────────
  const userDoc = await User.findOne({ userId: userId.toLowerCase() });
  if (!userDoc) {
    res.status(404); throw new Error(`User "${userId}" not found`);
  }

  // ── Sanitize each contact entry ────────────────────────────────
  const sanitized = contacts
    .filter((c) => c && (c.name || c.phone)) // skip completely empty entries
    .map((c) => ({
      name:   (c.name  || '').trim().slice(0, 200),
      phone:  (c.phone || '').replace(/[\s\-()]/g, '').slice(0, 20),
      email:  (c.email || '').trim().toLowerCase().slice(0, 200),
      avatar: (c.avatar || '').slice(0, 500),
    }));

  // ── Upsert: update if exists, create if not ────────────────────
  const result = await Contact.findOneAndUpdate(
    { user: userDoc._id },                     // find by user ref
    {
      $set: {
        user:           userDoc._id,
        userId:         userDoc.userId,
        contacts:       sanitized,
        totalCount:     sanitized.length,
        lastUploadedAt: new Date(),
      },
    },
    {
      upsert:    true,   // create if doesn't exist
      new:       true,   // return updated document
      runValidators: true,
    }
  );

  console.log(`[Contacts] Uploaded ${sanitized.length} contacts for user: ${userId}`);

  res.status(200).json({
    success:     true,
    message:     `${sanitized.length} contacts saved successfully`,
    userId:      userDoc.userId,
    totalSaved:  sanitized.length,
    lastUpdated: result.lastUploadedAt,
  });
});

/**
 * GET /api/uploadContacts/:userId
 * Admin-only — retrieve stored contacts for a specific user
 */
const getContactsByUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const userDoc = await User.findOne({ userId: userId.toLowerCase() });
  if (!userDoc) { res.status(404); throw new Error('User not found'); }

  const record = await Contact.findOne({ user: userDoc._id });
  if (!record) {
    return res.json({ success: true, userId, contacts: [], totalCount: 0, lastUploadedAt: null });
  }

  res.json({
    success:       true,
    userId:        record.userId,
    contacts:      record.contacts,
    totalCount:    record.totalCount,
    lastUploadedAt: record.lastUploadedAt,
  });
});

/**
 * GET /api/uploadContacts
 * Admin-only — list all users who have uploaded contacts
 */
const getAllContactRecords = asyncHandler(async (req, res) => {
  const records = await Contact.find({})
    .select('userId totalCount lastUploadedAt createdAt')
    .sort({ lastUploadedAt: -1 });

  res.json({ success: true, count: records.length, records });
});

module.exports = { uploadContacts, getContactsByUser, getAllContactRecords };
