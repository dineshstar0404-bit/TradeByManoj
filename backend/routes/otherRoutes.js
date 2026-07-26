const express = require('express');
const { getTransactions, getReport } = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');

const tRouter = express.Router();
tRouter.use(protect);
tRouter.get('/', getTransactions);

const rRouter = express.Router();
rRouter.use(protect);
rRouter.get('/', getReport);

module.exports = { transactionRoutes: tRouter, reportRoutes: rRouter };
