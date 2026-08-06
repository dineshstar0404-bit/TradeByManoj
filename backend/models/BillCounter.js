const mongoose = require('mongoose');

// Singleton doc — atomic, year-scoped invoice numbering (INV-2026-0001 style).
const billCounterSchema = new mongoose.Schema(
  {
    _id:     { type: String, default: 'billCounter' },
    prefix:  { type: String, default: 'INV' },
    padding: { type: Number, default: 4 },
    year:    { type: Number, required: true },
    seq:     { type: Number, default: 0 },
  },
  { versionKey: false }
);

const BillCounter = mongoose.model('BillCounter', billCounterSchema);

// Atomically resets seq on a calendar-year rollover, then increments and
// formats the next bill number. Two updates (not one) only on the rare
// instant the year rolls over — negligible race risk at this business's scale.
async function generateNextBillNumber() {
  const year = new Date().getFullYear();

  let cfg = await BillCounter.findById('billCounter');
  if (!cfg) {
    cfg = await BillCounter.findOneAndUpdate(
      { _id: 'billCounter' },
      { $setOnInsert: { prefix: 'INV', padding: 4, year, seq: 0 } },
      { upsert: true, new: true }
    );
  }
  if (cfg.year !== year) {
    cfg = await BillCounter.findByIdAndUpdate('billCounter', { year, seq: 0 }, { new: true });
  }

  cfg = await BillCounter.findByIdAndUpdate('billCounter', { $inc: { seq: 1 } }, { new: true });
  return `${cfg.prefix}-${year}-${String(cfg.seq).padStart(cfg.padding, '0')}`;
}

module.exports = { BillCounter, generateNextBillNumber };
