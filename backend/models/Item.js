const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true, trim: true },
    unit:         { type: String, required: true, trim: true, default: 'KG' },
    quantity:     { type: Number, required: true, default: 0, min: 0 },
    pricePerUnit: { type: Number, required: true, default: 0, min: 0 },
    createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Item', itemSchema);
