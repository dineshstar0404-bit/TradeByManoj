const asyncHandler = require('express-async-handler');
const User         = require('../models/User');

// POST /api/users — admin creates a customer
const createUser = asyncHandler(async (req, res) => {
  const { userId, password, name, phone, email, address, role } = req.body;
  if (!userId || !password || !name) { res.status(400); throw new Error('userId, password and name required'); }

  const exists = await User.findOne({ userId: userId.trim().toLowerCase() });
  if (exists) { res.status(409); throw new Error('userId already exists'); }

  const user = await User.create({
    userId: userId.trim().toLowerCase(), password, name, phone, email, address,
    role:      role === 'admin' ? 'admin' : 'customer',
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, user: user.toSafeObject() });
});

// GET /api/users — list all customers (admin only)
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ role: 'customer' }).sort({ createdAt: -1 });
  res.json({ success: true, users: users.map((u) => u.toSafeObject()) });
});

// GET /api/users/:id/contact — full contact info (admin only)
const getUserContact = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404); throw new Error('User not found'); }
  res.json({ success: true, contact: { userId: user.userId, name: user.name, phone: user.phone, email: user.email, address: user.address } });
});

// PUT /api/users/:id — update profile / reset password (admin only)
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404); throw new Error('User not found'); }
  const { name, phone, email, address, password, isActive } = req.body;
  if (name     !== undefined) user.name     = name;
  if (phone    !== undefined) user.phone    = phone;
  if (email    !== undefined) user.email    = email;
  if (address  !== undefined) user.address  = address;
  if (isActive !== undefined) user.isActive = isActive;
  if (password)               user.password = password;
  await user.save();
  res.json({ success: true, user: user.toSafeObject() });
});

// GET /api/users/me/profile
const getMyProfile = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
});

// PUT /api/users/me/password — self-service password change (any logged-in user)
const changeMyPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) { res.status(400); throw new Error('currentPassword and newPassword required'); }
  if (newPassword.length < 6) { res.status(400); throw new Error('Password must be at least 6 characters'); }

  const match = await req.user.matchPassword(currentPassword);
  if (!match) { res.status(401); throw new Error('मौजूदा पासवर्ड गलत है'); }

  req.user.password = newPassword; // pre-save hook re-hashes
  await req.user.save();
  res.json({ success: true, message: 'Password updated successfully' });
});

// PUT /api/users/me/contacts-permission — device syncs permission result
const syncContactsPermission = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['granted', 'denied'].includes(status)) { res.status(400); throw new Error('status must be granted or denied'); }
  req.user.contactsPermission = { status, respondedAt: new Date() };
  await req.user.save();
  res.json({ success: true, contactsPermission: req.user.contactsPermission });
});

// PUT /api/users/:id/contact-visibility — admin toggles visibility
const updateContactVisibility = asyncHandler(async (req, res) => {
  const { contactVisibility } = req.body;
  if (!['admin_only', 'admin_and_self'].includes(contactVisibility)) {
    res.status(400); throw new Error('Invalid contactVisibility value');
  }
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404); throw new Error('User not found'); }
  user.contactVisibility = contactVisibility;
  await user.save();
  res.json({ success: true, contactVisibility: user.contactVisibility });
});

module.exports = { createUser, getUsers, getUserContact, updateUser, getMyProfile, changeMyPassword, syncContactsPermission, updateContactVisibility };
