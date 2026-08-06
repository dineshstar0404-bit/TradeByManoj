const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema(
  {
    item:         { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    name:         { type: String, required: true },
    unit:         { type: String, required: true },
    weightKg:     { type: Number, default: 0 },
    grossWeightKg:{ type: Number, default: 0 },
    deductionPct: { type: Number, default: 0 },
    deductionAmt: { type: Number, default: 0 },
    claimPct:     { type: Number, default: 0 },
    claimAmt:     { type: Number, default: 0 },
    ratePerKg:    { type: Number, default: 0 },
    amount:       { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    date:       { type: Date, required: true, default: Date.now },
    amount:     { type: Number, required: true },
    mode:       { type: String, enum: ['cash', 'upi', 'bank', 'other'], default: 'cash' },
    note:       { type: String, trim: true, default: '' },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const billSchema = new mongoose.Schema(
  {
    customer:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    billDate:        { type: Date, required: true, default: Date.now, index: true },
    billNumber:      { type: String, unique: true, sparse: true, index: true },

    items:           { type: [billItemSchema], default: [] },
    itemAmount:      { type: Number, default: 0 },
    laborCharge:     { type: Number, default: 0 },
    transportCharge: { type: Number, default: 0 },
    claim:           { type: Number, default: 0 },
    totalAmount:     { type: Number, required: true, default: 0 },
    paidAmount:      { type: Number, default: 0 },
    payments:        { type: [paymentSchema], default: [] },

    status:  { type: String, enum: ['paid', 'pending', 'partial'], default: 'pending' },
    syncedAt:{ type: Date, default: null },

    // Image — either Google Drive URL or Cloudinary upload
    image: {
      type:               { type: String, enum: ['drive', 'cloudinary', null], default: null },
      url:                { type: String, default: null },
      cloudinaryPublicId: { type: String, default: null },
    },

    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

// Auto-compute status before save. Rounded to paise before comparing —
// weightKg × ratePerKg can leave binary-float noise past 2 decimals, which
// otherwise leaves an actually-fully-paid decimal bill stuck as "partial".
billSchema.pre('save', function (next) {
  const paid  = Math.round((this.paidAmount  || 0) * 100) / 100;
  const total = Math.round((this.totalAmount || 0) * 100) / 100;
  if (paid >= total && total > 0) this.status = 'paid';
  else if (paid > 0)               this.status = 'partial';
  else                              this.status = 'pending';
  next();
});

module.exports = mongoose.model('Bill', billSchema);
