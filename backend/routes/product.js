const express = require('express');
const router = express.Router();
const upload = require('../utils/multer');
const {
  getAllProducts, getSingleProduct, createProduct, updateProduct,
  deleteProduct, restoreProduct, uploadPhotos, setMainPhoto, deletePhoto, searchAutocomplete
} = require('../controllers/product');
const { isAdmin } = require('../middlewares/auth');

router.get('/products', getAllProducts);
router.get('/products/search', searchAutocomplete);
router.get('/products/:id', getSingleProduct);
router.post('/products', isAdmin, upload.array('photos', 10), createProduct);
router.put('/products/:id/restore', isAdmin, restoreProduct);
router.put('/products/:id', isAdmin, upload.array('photos', 10), updateProduct);
router.delete('/products/:id', isAdmin, deleteProduct);
router.post('/products/:product_id/photos', isAdmin, upload.array('photos', 10), uploadPhotos);
router.put('/products/:product_id/photos/:photo_id/main', isAdmin, setMainPhoto);
router.delete('/products/:product_id/photos/:photo_id', isAdmin, deletePhoto);

module.exports = router;
