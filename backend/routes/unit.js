const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/unit');
const { isAdmin } = require('../middlewares/auth');

router.get('/units', isAdmin, ctrl.getAll);
router.post('/units', isAdmin, ctrl.create);
router.put('/units/:id/restore', isAdmin, ctrl.restore);
router.put('/units/:id', isAdmin, ctrl.update);
router.delete('/units/:id', isAdmin, ctrl.delete);

module.exports = router;
