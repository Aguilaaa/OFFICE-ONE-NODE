const express = require('express');
const router = express.Router();
const {
  registerUser, loginUser, getAllUsers, createUser, updateUserRole, deactivateUser, restoreUser
} = require('../controllers/user');
const { isAdmin } = require('../middlewares/auth');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/users', isAdmin, getAllUsers);
router.post('/users', isAdmin, createUser);
router.put('/users/:id/role', isAdmin, updateUserRole);
router.put('/users/:id/restore', isAdmin, restoreUser);
router.put('/users/:id/status', isAdmin, deactivateUser);

module.exports = router;
