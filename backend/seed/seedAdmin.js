require('dotenv').config();
const mongoose  = require('mongoose');
const connectDB = require('../config/db');
const User      = require('../models/User');

(async () => {
  await connectDB();
  const userId   = (process.env.SEED_ADMIN_ID       || 'admin').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD  || 'admin123';
  const name     = process.env.SEED_ADMIN_NAME      || 'Manoj Traders Admin';

  let admin = await User.findOne({ userId });
  if (admin) {
    admin.password = password; admin.role = 'admin';
    await admin.save();
    console.log(`✅ Admin "${userId}" password updated.`);
  } else {
    await User.create({ userId, password, name, role: 'admin' });
    console.log(`✅ Admin "${userId}" created.`);
  }
  console.log('Login with:', { userId, password });
  await mongoose.connection.close();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
