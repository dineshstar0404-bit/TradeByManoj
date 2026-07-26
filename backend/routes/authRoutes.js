const express    = require('express');
const { login, getMe, adminResetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/login',                 login);
router.get('/me',          protect,   getMe);
router.post('/admin-reset-password',  adminResetPassword); // no OTP — recovery key only

module.exports = router;
