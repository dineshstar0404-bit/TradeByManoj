const asyncHandler = require('express-async-handler');
const Item         = require('../models/Item');

const createItem = asyncHandler(async (req, res) => {
  const { name, unit, quantity, pricePerUnit } = req.body;
  if (!name) { res.status(400); throw new Error('Item name required'); }
  const item = await Item.create({ name, unit: unit||'KG', quantity: quantity||0, pricePerUnit: pricePerUnit||0, createdBy: req.user._id });
  res.status(201).json({ success: true, item });
});

const getItems = asyncHandler(async (req, res) => {
  const items = await Item.find({ isActive: true }).sort({ name: 1 });
  res.json({ success: true, items });
});

const updateItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) { res.status(404); throw new Error('Item not found'); }
  const { name, unit, quantity, pricePerUnit, isActive } = req.body;
  if (name         !== undefined) item.name         = name;
  if (unit         !== undefined) item.unit         = unit;
  if (quantity     !== undefined) item.quantity     = quantity;
  if (pricePerUnit !== undefined) item.pricePerUnit = pricePerUnit;
  if (isActive     !== undefined) item.isActive     = isActive;
  await item.save();
  res.json({ success: true, item });
});

const deleteItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) { res.status(404); throw new Error('Item not found'); }
  item.isActive = false;
  await item.save();
  res.json({ success: true, message: 'Item deactivated' });
});

module.exports = { createItem, getItems, updateItem, deleteItem };
