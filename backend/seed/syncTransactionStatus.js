require('dotenv').config();
const mongoose     = require('mongoose');
const connectDB    = require('../config/db');
const Bill         = require('../models/Bill');
const Transaction  = require('../models/Transaction');

// One-time backfill: Transaction.status is snapshotted from Bill.status at
// bill-creation time and previously never re-synced when a bill's paidAmount
// changed later, leaving reports/dashboard "बकाया" stale even after a bill
// was marked Paid. This brings existing Transactions in line with their Bill.
(async () => {
  await connectDB();
  const bills = await Bill.find({}, '_id status');
  let updated = 0;
  for (const bill of bills) {
    const status = bill.status === 'paid' ? 'paid' : 'pending';
    const res = await Transaction.updateMany(
      { bill: bill._id, status: { $ne: status } },
      { status }
    );
    updated += res.modifiedCount || 0;
  }
  console.log(`✅ Synced ${updated} transaction(s) across ${bills.length} bill(s).`);
  await mongoose.connection.close();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
