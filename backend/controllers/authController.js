const asyncHandler  = require('express-async-handler');
const User          = require('../models/User');
const generateToken = require('../utils/generateToken');

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { userId, password } = req.body;
  if (!userId || !password) { res.status(400); throw new Error('userId and password required'); }

  const user = await User.findOne({ userId: userId.trim().toLowerCase() });
  if (!user || !user.isActive) { res.status(401); throw new Error('Invalid credentials'); }

  const match = await user.matchPassword(password);
  if (!match) { res.status(401); throw new Error('Invalid credentials'); }

  res.json({ success: true, token: generateToken(user._id), user: user.toSafeObject() });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
});

// POST /api/auth/admin-reset-password
// Body: { recoveryKey, newPassword }
// No OTP — matched against ADMIN_RECOVERY_KEY in .env
const adminResetPassword = asyncHandler(async (req, res) => {
  const { recoveryKey, newPassword } = req.body;
  if (!recoveryKey || !newPassword) { res.status(400); throw new Error('recoveryKey and newPassword required'); }
  if (recoveryKey !== process.env.ADMIN_RECOVERY_KEY) { res.status(401); throw new Error('Invalid recovery key'); }
  if (newPassword.length < 6) { res.status(400); throw new Error('Password must be at least 6 characters'); }

  const admin = await User.findOne({ role: 'admin' });
  if (!admin) { res.status(404); throw new Error('Admin account not found'); }

  admin.password = newPassword; // pre-save hook re-hashes
  await admin.save();

  res.json({ success: true, message: 'Admin password updated successfully' });
});

module.exports = { login, getMe, adminResetPassword };
