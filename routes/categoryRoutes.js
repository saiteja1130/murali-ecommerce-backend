import express from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import { protect, adminOnly } from '../middlewares/authMiddleware.js';
import { uploadCategoryImages } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// Public route to get categories
router.route('/').get(getCategories);

// Admin only routes for managing categories
router.route('/')
  .post(protect, adminOnly, uploadCategoryImages.single('image'), createCategory);

router.route('/:id')
  .put(protect, adminOnly, uploadCategoryImages.single('image'), updateCategory)
  .delete(protect, adminOnly, deleteCategory);

export default router;
