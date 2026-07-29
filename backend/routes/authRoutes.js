const express    = require('express');
const { login, getMe, adminResetPassword, getRecoveryKeyHint } = require('../controllers/authController');
const { protect }     = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

router.post('/login',                 login);
router.get('/me',          protect,   getMe);
router.post('/admin-reset-password',  adminResetPassword); // no OTP — recovery key only
router.get('/recovery-key', protect, requireRole('admin'), getRecoveryKeyHint);

module.exports = router;
