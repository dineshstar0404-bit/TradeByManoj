const express = require('express');
const { createBill, getBills, getBillById, updateBill, deleteBill } = require('../controllers/billController');
const { protect }     = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { upload }      = require('../config/cloudinary');

const router = express.Router();
router.use(protect);
router.get('/',      getBills);
router.get('/:id',   getBillById);
router.post('/',     requireRole('admin'), upload.single('photo'), createBill);
router.put('/:id',   requireRole('admin'), upload.single('photo'), updateBill);
router.delete('/:id',requireRole('admin'), deleteBill);
module.exports = router;
