const db = require('../models');
const Product = db.Product;
const ProductPhoto = db.ProductPhoto;
const { Op } = require('sequelize');
const { trashedWhere, softDeleteRow, restoreRow } = require('../utils/softDelete');
const fs = require('fs/promises');
const path = require('path');

const attachPhotos = async (product, files = [], transaction) => {
  const photos = [];
  for (const file of files) {
    photos.push(await ProductPhoto.create({
      product_id: product.id,
      photo_path: file.path.replace(/\\/g, '/'),
      is_main: 0
    }, { transaction }));
  }

  if (photos.length && !product.image_url) {
    await ProductPhoto.update(
      { is_main: 0 },
      { where: { product_id: product.id }, transaction }
    );
    await photos[0].update({ is_main: 1 }, { transaction });
    await product.update({ image_url: photos[0].photo_path }, { transaction });
  }

  return photos;
};

exports.getAllProducts = async (req, res) => {
  try {
    const { search, category, trashed } = req.query;
    const where = { ...trashedWhere(trashed) };
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { item_code: { [Op.like]: `%${search}%` } }
      ];
    }
    if (category) where.category = category;
    const products = await Product.findAll({
      where,
      include: [{ model: ProductPhoto }],
      order: [['createdAt', 'DESC']]
    });
    return res.status(200).json({ rows: products });
  } catch (err) {
    return res.status(500).json({ error: 'Error fetching products' });
  }
};

exports.getSingleProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      where: { id: req.params.id, deleted_at: null },
      include: [{ model: ProductPhoto }]
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    return res.status(200).json({ success: true, result: product });
  } catch (err) {
    return res.status(500).json({ error: 'Error fetching product' });
  }
};

exports.searchAutocomplete = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(200).json({ rows: [] });
    const products = await Product.findAll({
      where: {
        deleted_at: null,
        is_active: 1,
        [Op.or]: [
          { name: { [Op.like]: `%${q}%` } },
          { item_code: { [Op.like]: `%${q}%` } }
        ]
      },
      attributes: ['id', 'name', 'item_code', 'unit_price', 'category'],
      limit: 8
    });
    return res.status(200).json({ rows: products });
  } catch (err) {
    return res.status(500).json({ error: 'Search error' });
  }
};

exports.createProduct = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const data = { ...req.body, category: req.body.category || 'Product', stock_quantity: req.body.stock_quantity || 0, is_active: req.body.is_active ?? 1 };
    data.unit = data.unit || null;
    const product = await Product.create(data, { transaction });
    await attachPhotos(product, req.files || [], transaction);
    await transaction.commit();
    return res.status(201).json({ success: true, product });
  } catch (err) {
    await transaction.rollback();
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Item code already exists' });
    }
    return res.status(500).json({ error: 'Error creating product' });
  }
};

exports.updateProduct = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const updateData = { ...req.body };
    if (!Object.prototype.hasOwnProperty.call(updateData, 'unit')) updateData.unit = null;
    const product = await Product.findByPk(req.params.id, { transaction });
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }
    await product.update(updateData, { transaction });
    await attachPhotos(product, req.files || [], transaction);
    await transaction.commit();
    return res.status(200).json({ success: true });
  } catch (err) {
    await transaction.rollback();
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Item code already exists' });
    }
    return res.status(500).json({ error: 'Error updating product' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    const result = await softDeleteRow(product);
    if (result.status !== 200) return res.status(result.status).json({ error: result.error });
    return res.status(200).json({ success: true, message: 'Product moved to trash' });
  } catch (err) {
    return res.status(500).json({ error: 'Error deleting product' });
  }
};

exports.restoreProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    const result = await restoreRow(product);
    if (result.status !== 200) return res.status(result.status).json({ error: result.error });
    return res.status(200).json({ success: true, message: 'Product restored' });
  } catch (err) {
    return res.status(500).json({ error: 'Error restoring product' });
  }
};

exports.uploadPhotos = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.product_id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const photos = await Promise.all((req.files || []).map((f) =>
      ProductPhoto.create({
        product_id: req.params.product_id,
        photo_path: f.path.replace(/\\/g, '/'),
        is_main: 0
      })
    ));

    if (photos.length && !product.image_url) {
      await ProductPhoto.update({ is_main: 0 }, { where: { product_id: product.id } });
      await photos[0].update({ is_main: 1 });
      await product.update({ image_url: photos[0].photo_path });
    }

    return res.status(201).json({ success: true, photos });
  } catch (err) {
    return res.status(500).json({ error: 'Error uploading photos' });
  }
};

exports.setMainPhoto = async (req, res) => {
  try {
    const photo = await ProductPhoto.findOne({
      where: { id: req.params.photo_id, product_id: req.params.product_id }
    });
    if (!photo) return res.status(404).json({ error: 'Photo not found' });

    await ProductPhoto.update({ is_main: 0 }, { where: { product_id: req.params.product_id } });
    await photo.update({ is_main: 1 });
    await Product.update({ image_url: photo.photo_path }, { where: { id: req.params.product_id } });

    return res.status(200).json({ success: true, image_url: photo.photo_path });
  } catch (err) {
    return res.status(500).json({ error: 'Error setting main photo' });
  }
};

exports.deletePhoto = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const photo = await ProductPhoto.findOne({
      where: { id: req.params.photo_id, product_id: req.params.product_id },
      transaction
    });
    if (!photo) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Photo not found' });
    }

    const product = await Product.findByPk(req.params.product_id, { transaction });
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }

    const deletedPhotoPath = photo.photo_path;
    const wasMain = product.image_url === photo.photo_path || Number(photo.is_main) === 1;
    await photo.destroy({ transaction });

    if (wasMain) {
      const nextPhoto = await ProductPhoto.findOne({
        where: { product_id: req.params.product_id },
        order: [['createdAt', 'ASC']],
        transaction
      });

      if (nextPhoto) {
        await ProductPhoto.update(
          { is_main: 0 },
          { where: { product_id: req.params.product_id }, transaction }
        );
        await nextPhoto.update({ is_main: 1 }, { transaction });
        await product.update({ image_url: nextPhoto.photo_path }, { transaction });
      } else {
        await product.update({ image_url: null }, { transaction });
      }
    }

    await transaction.commit();

    const filePath = path.join(__dirname, '..', deletedPhotoPath);
    await fs.unlink(filePath).catch(() => {});

    return res.status(200).json({ success: true, message: 'Photo deleted' });
  } catch (err) {
    await transaction.rollback();
    return res.status(500).json({ error: 'Error deleting photo' });
  }
};
