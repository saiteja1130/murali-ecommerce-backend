import express from 'express';
import {
  getMainCategories,
  getMainCategoryById,
  createMainCategory,
  updateMainCategory,
  deleteMainCategory,
} from '../controllers/mainCategoryController.js';
import { protect, adminOnly } from '../middlewares/authMiddleware.js';
import { uploadMainCategoryImages } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// Public routes
router.route('/').get(getMainCategories);
router.route('/:id').get(getMainCategoryById);

// Admin-only management routes
router.route('/')
  .post(protect, adminOnly, uploadMainCategoryImages.single('image'), createMainCategory);

router.route('/:id')
  .put(protect, adminOnly, uploadMainCategoryImages.single('image'), updateMainCategory)
  .delete(protect, adminOnly, deleteMainCategory);

export default router;
