const mongoose = require('mongoose');

/**
 * Stores the device contacts uploaded by a specific user.
 * One document per user — contacts array is replaced on each upload
 * (upsert pattern keeps storage lean).
 *
 * Route: POST /api/uploadContacts  (Task 6)
 */
const contactEntrySchema = new mongoose.Schema(
  {
    name:   { type: String, default: '' },
    phone:  { type: String, default: '' },
    email:  { type: String, default: '' },
    avatar: { type: String, default: '' }, // thumbnailPath from device
  },
  { _id: false }
);

const contactSchema = new mongoose.Schema(
  {
    // Linked to the User who uploaded these contacts
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      unique:   true,  // one document per user
      index:    true,
    },
    userId: { type: String, required: true }, // denormalized for quick lookup

    contacts: { type: [contactEntrySchema], default: [] },

    totalCount:    { type: Number, default: 0 },
    lastUploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Contact', contactSchema);
