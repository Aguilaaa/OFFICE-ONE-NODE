const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/category');
const { isAdmin } = require('../middlewares/auth');

router.get('/categories', isAdmin, ctrl.getAll);
router.post('/categories', isAdmin, ctrl.create);
router.put('/categories/:id/restore', isAdmin, ctrl.restore);
router.put('/categories/:id', isAdmin, ctrl.update);
router.delete('/categories/:id', isAdmin, ctrl.delete);

module.exports = router;
