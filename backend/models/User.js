const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    userId:   { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    name:     { type: String, required: true, trim: true },
    role:     { type: String, enum: ['admin', 'customer'], default: 'customer' },

    // Contact info (admin-only via API)
    phone:   { type: String, trim: true },
    email:   { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },

    // Controls whether customer can view their own contact info
    contactVisibility: {
      type:    String,
      enum:    ['admin_only', 'admin_and_self'],
      default: 'admin_only',
    },

    // Synced from device after requestContactsPermissionOnce()
    contactsPermission: {
      status:      { type: String, enum: ['granted', 'denied', 'unknown'], default: 'unknown' },
      respondedAt: { type: Date, default: null },
    },

    isActive:  { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// Hash password before save (only when modified)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt    = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

userSchema.methods.toSafeObject = function () {
  return {
    id:                 this._id,
    userId:             this.userId,
    name:               this.name,
    role:               this.role,
    isActive:           this.isActive,
    contactVisibility:  this.contactVisibility,
    contactsPermission: this.contactsPermission,
    createdAt:          this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
