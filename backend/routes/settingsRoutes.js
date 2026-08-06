const express = require('express');
const { getBillNumberSettings, updateBillNumberSettings } = require('../controllers/settingsController');
const { protect }     = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();
router.use(protect, requireRole('admin'));

router.get('/bill-number', getBillNumberSettings);
router.put('/bill-number', updateBillNumberSettings);

module.exports = router;
