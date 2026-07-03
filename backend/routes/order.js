const express = require('express');
const router = express.Router();
const {
  getAllOrders, getMyOrders, getMyOrder, getMyOrderReceipt, getOrderReceipt,
  createOrder, updateOrder,
  deleteOrder, restoreOrder, getIncomeReport, checkout
} = require('../controllers/order');
const { isAuthenticatedUser, isAdmin } = require('../middlewares/auth');

router.get('/my-orders', isAuthenticatedUser, getMyOrders);
router.get('/my-orders/:id/receipt', isAuthenticatedUser, getMyOrderReceipt);
router.get('/my-orders/:id', isAuthenticatedUser, getMyOrder);
router.get('/orders', isAdmin, getAllOrders);
router.get('/orders/:id/receipt', isAdmin, getOrderReceipt);
router.post('/checkout', isAuthenticatedUser, checkout);
router.post('/orders', isAdmin, createOrder);
router.put('/orders/:id/restore', isAdmin, restoreOrder);
router.put('/orders/:id', isAdmin, updateOrder);
router.delete('/orders/:id', isAdmin, deleteOrder);
router.get('/income', isAdmin, getIncomeReport);

module.exports = router;
