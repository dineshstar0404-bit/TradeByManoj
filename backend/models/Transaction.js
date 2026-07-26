const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    item:       { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    itemName:   { type: String, required: true },
    customer:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    bill:       { type: mongoose.Schema.Types.ObjectId, ref: 'Bill', default: null },

    type:       { type: String, enum: ['sale', 'purchase'], default: 'sale' },
    weightKg:   { type: Number, default: 0 },
    ratePerKg:  { type: Number, default: 0 },
    amount:     { type: Number, required: true },
    status:     { type: String, enum: ['paid', 'pending'], default: 'pending' },

    date:      { type: Date, required: true, default: Date.now, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

transactionSchema.index({ date: 1, customer: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
