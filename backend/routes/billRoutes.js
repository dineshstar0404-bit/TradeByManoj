const express = require('express');
const multer  = require('multer');
const { createBill, getBills, getBillById, updateBill, deleteBill } = require('../controllers/billController');
const { protect }     = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { upload }      = require('../config/cloudinary');

// Surfaces the real reason a photo upload failed (size, format, network abort,
// bad Cloudinary credentials) instead of letting it fall through as a blank
// "Server error" — Multer/Cloudinary errors don't always carry a clean .message.
const uploadPhoto = (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return next(new Error('फोटो का साइज़ बहुत बड़ा है (8MB से कम रखें)।'));
      return next(new Error(`फोटो अपलोड विफल: ${err.message}`));
    }
    next(new Error(err?.message || 'फोटो अपलोड विफल — Cloudinary से कनेक्ट नहीं हो सका।'));
  });
};

const router = express.Router();
router.use(protect);
router.get('/',      getBills);
router.get('/:id',   getBillById);
router.post('/',     requireRole('admin'), uploadPhoto, createBill);
router.put('/:id',   requireRole('admin'), uploadPhoto, updateBill);
router.delete('/:id',requireRole('admin'), deleteBill);
module.exports = router;
