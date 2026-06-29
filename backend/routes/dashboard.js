const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboard');
const { isAdmin } = require('../middlewares/auth');

router.get('/dashboard', isAdmin, getDashboardStats);

module.exports = router;
