const express = require('express');
const router = express.Router();
const {
  getAllTransactions, getMyOrders, getMyOrder, createTransaction, updateTransaction,
  deleteTransaction, restoreTransaction, getIncomeReport, checkout
} = require('../controllers/transaction');
const { isAuthenticatedUser, isAdmin } = require('../middlewares/auth');

router.get('/my-orders', isAuthenticatedUser, getMyOrders);
router.get('/my-orders/:id', isAuthenticatedUser, getMyOrder);
router.get('/transactions', isAdmin, getAllTransactions);
router.post('/checkout', isAuthenticatedUser, checkout);
router.post('/transactions', isAdmin, createTransaction);
router.put('/transactions/:id/restore', isAdmin, restoreTransaction);
router.put('/transactions/:id', isAdmin, updateTransaction);
router.delete('/transactions/:id', isAdmin, deleteTransaction);
router.get('/income', isAdmin, getIncomeReport);

module.exports = router;
