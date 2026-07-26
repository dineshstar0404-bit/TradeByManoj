// routes/itemRoutes.js
const express = require('express');
const { createItem, getItems, updateItem, deleteItem } = require('../controllers/itemController');
const { protect }     = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const router = express.Router();
router.use(protect);
router.get('/',     getItems);
router.post('/',    requireRole('admin'), createItem);
router.put('/:id',  requireRole('admin'), updateItem);
router.delete('/:id', requireRole('admin'), deleteItem);
module.exports = router;
