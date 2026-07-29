const asyncHandler  = require('express-async-handler');
const Bill          = require('../models/Bill');
const Transaction   = require('../models/Transaction');
const { cloudinary } = require('../config/cloudinary');

const _createTransactions = async (bill, createdBy) => {
  const docs = bill.items.map((li) => ({
    item: li.item, itemName: li.name, customer: bill.customer, bill: bill._id,
    type: 'sale', weightKg: li.weightKg, ratePerKg: li.ratePerKg,
    amount: li.amount, status: bill.status === 'paid' ? 'paid' : 'pending',
    date: bill.billDate, createdBy,
  }));
  if (docs.length) await Transaction.insertMany(docs);
};

// POST /api/bills
const createBill = asyncHandler(async (req, res) => {
  const { customer, billDate, items, itemAmount, laborCharge, transportCharge, claim, paidAmount, notes, driveImageUrl } = req.body;
  if (!customer || !items) { res.status(400); throw new Error('customer and items required'); }

  const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;

  let image = { type: null, url: null, cloudinaryPublicId: null };
  if (req.file) {
    image = { type: 'cloudinary', url: req.file.path, cloudinaryPublicId: req.file.filename };
  } else if (driveImageUrl) {
    image = { type: 'drive', url: driveImageUrl, cloudinaryPublicId: null };
  }

  const total = Number(itemAmount||0) - Number(laborCharge||0) - Number(transportCharge||0) - Number(claim||0);

  const bill = await Bill.create({
    customer, createdBy: req.user._id,
    billDate:        billDate || Date.now(),
    items:           parsedItems,
    itemAmount:      Number(itemAmount)||0,
    laborCharge:     Number(laborCharge)||0,
    transportCharge: Number(transportCharge)||0,
    claim:           Number(claim)||0,
    totalAmount:     total,
    paidAmount:      Number(paidAmount)||0,
    notes, image,
  });

  await _createTransactions(bill, req.user._id);
  res.status(201).json({ success: true, bill });
});

// GET /api/bills
const getBills = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'admin') { if (req.query.customer) filter.customer = req.query.customer; }
  else                           { filter.customer = req.user._id; } // row-level isolation
  if (req.query.from || req.query.to) {
    filter.billDate = {};
    if (req.query.from) filter.billDate.$gte = new Date(req.query.from);
    if (req.query.to)   filter.billDate.$lte = new Date(req.query.to);
  }
  const bills = await Bill.find(filter).populate('customer', 'name userId').sort({ billDate: -1 });
  res.json({ success: true, bills });
});

// GET /api/bills/:id
const getBillById = asyncHandler(async (req, res) => {
  const bill = await Bill.findById(req.params.id).populate('customer', 'name userId');
  if (!bill) { res.status(404); throw new Error('Bill not found'); }
  if (req.user.role !== 'admin' && bill.customer._id.toString() !== req.user._id.toString()) {
    res.status(403); throw new Error('Access denied');
  }
  res.json({ success: true, bill });
});

// PUT /api/bills/:id
const updateBill = asyncHandler(async (req, res) => {
  const bill = await Bill.findById(req.params.id);
  if (!bill) { res.status(404); throw new Error('Bill not found'); }
  const { laborCharge, transportCharge, claim, paidAmount, notes, driveImageUrl, syncedAt } = req.body;
  if (laborCharge     !== undefined) bill.laborCharge     = Number(laborCharge);
  if (transportCharge !== undefined) bill.transportCharge = Number(transportCharge);
  if (claim           !== undefined) bill.claim           = Number(claim);
  if (paidAmount      !== undefined) bill.paidAmount      = Number(paidAmount);
  if (notes           !== undefined) bill.notes           = notes;
  if (syncedAt)                      bill.syncedAt        = new Date(syncedAt);
  bill.totalAmount = (bill.itemAmount||0) - (bill.laborCharge||0) - (bill.transportCharge||0) - (bill.claim||0);
  if (req.file) {
    if (bill.image?.cloudinaryPublicId) await cloudinary.uploader.destroy(bill.image.cloudinaryPublicId).catch(()=>{});
    bill.image = { type: 'cloudinary', url: req.file.path, cloudinaryPublicId: req.file.filename };
  } else if (driveImageUrl) {
    bill.image = { type: 'drive', url: driveImageUrl, cloudinaryPublicId: null };
  }
  await bill.save();
  await Transaction.updateMany(
    { bill: bill._id },
    { status: bill.status === 'paid' ? 'paid' : 'pending' }
  );
  res.json({ success: true, bill });
});

// DELETE /api/bills/:id
const deleteBill = asyncHandler(async (req, res) => {
  const bill = await Bill.findById(req.params.id);
  if (!bill) { res.status(404); throw new Error('Bill not found'); }
  if (bill.image?.cloudinaryPublicId) await cloudinary.uploader.destroy(bill.image.cloudinaryPublicId).catch(()=>{});
  await Transaction.deleteMany({ bill: bill._id });
  await bill.deleteOne();
  res.json({ success: true, message: 'Bill deleted' });
});

module.exports = { createBill, getBills, getBillById, updateBill, deleteBill };
