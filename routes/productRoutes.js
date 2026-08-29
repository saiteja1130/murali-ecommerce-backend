import express from 'express';
import {
  getProducts,
  getProductById,
  getProductFacets,
  createProduct,
  updateProduct,
  toggleStockAvailability,
  softDeleteProduct,
  restoreProduct,
} from '../controllers/productController.js';
import { protect, adminOnly } from '../middlewares/authMiddleware.js';
import { uploadProductImages } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// Public routes for storefront & admin reading
router.get('/', getProducts);
router.get('/facets', getProductFacets);
router.get('/:id', getProductById);

// Admin protected routes for creating/modifying products (using FormData & Multer)
router.post(
  '/',
  protect,
  adminOnly,
  uploadProductImages.array('images', 10),
  createProduct
);

router.put(
  '/:id',
  protect,
  adminOnly,
  uploadProductImages.array('images', 10),
  updateProduct
);

router.patch(
  '/:id/toggle-stock',
  protect,
  adminOnly,
  toggleStockAvailability
);

router.delete(
  '/:id',
  protect,
  adminOnly,
  softDeleteProduct
);

router.patch(
  '/:id/archive',
  protect,
  adminOnly,
  softDeleteProduct
);

router.patch(
  '/:id/restore',
  protect,
  adminOnly,
  restoreProduct
);

export default router;
