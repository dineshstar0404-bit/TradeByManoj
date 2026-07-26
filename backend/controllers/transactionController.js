const asyncHandler = require('express-async-handler');
const mongoose     = require('mongoose');
const Transaction  = require('../models/Transaction');

// GET /api/transactions?month=7&year=2026&customer=<id>
const getTransactions = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'admin') { if (req.query.customer) filter.customer = req.query.customer; }
  else                           { filter.customer = req.user._id; }
  if (req.query.month && req.query.year) {
    const y = Number(req.query.year), m = Number(req.query.month);
    filter.date = { $gte: new Date(y, m-1, 1), $lte: new Date(y, m, 0, 23, 59, 59) };
  }
  const transactions = await Transaction.find(filter).populate('customer', 'name userId').sort({ date: -1 });
  res.json({ success: true, transactions });
});

// GET /api/reports?period=daily|weekly|monthly|yearly&customer=<id>
const getReport = asyncHandler(async (req, res) => {
  const { period = 'monthly', customer } = req.query;
  const formats = { daily:'%Y-%m-%d', weekly:'%Y-%U', monthly:'%Y-%m', yearly:'%Y' };
  if (!formats[period]) { res.status(400); throw new Error('Invalid period'); }

  const match = {};
  if (req.user.role === 'admin') { if (customer) match.customer = new mongoose.Types.ObjectId(customer); }
  else                           { match.customer = req.user._id; }

  const buckets = await Transaction.aggregate([
    { $match: match },
    { $group: {
        _id:           { $dateToString: { format: formats[period], date: '$date' } },
        totalAmount:   { $sum: '$amount' },
        paidAmount:    { $sum: { $cond: [{ $eq: ['$status','paid'] }, '$amount', 0] } },
        pendingAmount: { $sum: { $cond: [{ $eq: ['$status','pending'] }, '$amount', 0] } },
        count:         { $sum: 1 },
    }},
    { $sort: { _id: -1 } },
    { $limit: 100 },
  ]);

  const summary = buckets.reduce(
    (a, b) => ({ totalAmount: a.totalAmount+b.totalAmount, paidAmount: a.paidAmount+b.paidAmount, pendingAmount: a.pendingAmount+b.pendingAmount }),
    { totalAmount:0, paidAmount:0, pendingAmount:0 }
  );

  res.json({ success: true, period, summary, buckets });
});

module.exports = { getTransactions, getReport };
