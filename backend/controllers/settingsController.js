const asyncHandler = require('express-async-handler');
const { BillCounter } = require('../models/BillCounter');

// GET /api/settings/bill-number — admin-only
const getBillNumberSettings = asyncHandler(async (req, res) => {
  const year = new Date().getFullYear();
  let cfg = await BillCounter.findById('billCounter');
  if (!cfg) cfg = await BillCounter.create({ _id: 'billCounter', prefix: 'INV', padding: 4, year, seq: 0 });

  const nextSeq = cfg.year === year ? cfg.seq + 1 : 1;
  const nextPreview = `${cfg.prefix}-${year}-${String(nextSeq).padStart(cfg.padding, '0')}`;
  res.json({ success: true, prefix: cfg.prefix, padding: cfg.padding, nextPreview });
});

// PUT /api/settings/bill-number — admin-only
// Body: { prefix?, padding?, resetTo? } — resetTo sets the NEXT bill's
// starting number without touching prefix/padding unless also provided.
const updateBillNumberSettings = asyncHandler(async (req, res) => {
  const { prefix, padding, resetTo } = req.body;
  const year = new Date().getFullYear();
  const update = { year }; // updating settings also anchors the counter to the current year
  if (prefix  !== undefined) update.prefix  = String(prefix).trim().toUpperCase();
  if (padding !== undefined) update.padding = Number(padding);
  if (resetTo !== undefined) {
    if (Number(resetTo) < 1) { res.status(400); throw new Error('resetTo must be at least 1'); }
    update.seq = Number(resetTo) - 1;
  }

  // $set and $setOnInsert can't target the same path in one update — drop
  // any default already covered by an explicit value in `update`.
  const setOnInsert = { prefix: 'INV', padding: 4, seq: 0 };
  for (const k of Object.keys(setOnInsert)) if (k in update) delete setOnInsert[k];

  const cfg = await BillCounter.findByIdAndUpdate(
    'billCounter',
    { $set: update, $setOnInsert: setOnInsert },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const nextPreview = `${cfg.prefix}-${cfg.year}-${String(cfg.seq + 1).padStart(cfg.padding, '0')}`;
  res.json({ success: true, prefix: cfg.prefix, padding: cfg.padding, nextPreview });
});

module.exports = { getBillNumberSettings, updateBillNumberSettings };
