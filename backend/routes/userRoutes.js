const express = require('express');
const {
  createUser, getUsers, getUserContact, updateUser,
  getMyProfile, changeMyPassword, syncContactsPermission, updateContactVisibility,
} = require('../controllers/userController');
const { protect }      = require('../middleware/auth');
const { requireRole }  = require('../middleware/role');

const router = express.Router();
router.use(protect);

router.get('/me/profile',                   getMyProfile);
router.put('/me/password',                  changeMyPassword);
router.put('/me/contacts-permission',       syncContactsPermission);
router.post('/',                            requireRole('admin'), createUser);
router.get('/',                             requireRole('admin'), getUsers);
router.get('/:id/contact',                  requireRole('admin'), getUserContact);
router.put('/:id',                          requireRole('admin'), updateUser);
router.put('/:id/contact-visibility',       requireRole('admin'), updateContactVisibility);

module.exports = router;
