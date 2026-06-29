const express = require('express');
const router = express.Router();
const {
  getAllCustomers, getSingleCustomer, createCustomer, updateCustomer, deleteCustomer, restoreCustomer
} = require('../controllers/customer');
const { isAdmin } = require('../middlewares/auth');

router.get('/customers', isAdmin, getAllCustomers);
router.get('/customers/:id', isAdmin, getSingleCustomer);
router.post('/customers', isAdmin, createCustomer);
router.put('/customers/:id/restore', isAdmin, restoreCustomer);
router.put('/customers/:id', isAdmin, updateCustomer);
router.delete('/customers/:id', isAdmin, deleteCustomer);

module.exports = router;
