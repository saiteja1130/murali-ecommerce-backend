import express from 'express';
import { protect, adminOnly } from '../middlewares/authMiddleware.js';
import { uploadHeroImages } from '../middlewares/uploadMiddleware.js';
import {
  getHeroSlides,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  reorderHeroSlides,
} from '../controllers/heroController.js';

const router = express.Router();

router.get('/', getHeroSlides); // Publicly accessible for the storefront
router.post('/', protect, adminOnly, uploadHeroImages.single('image'), createHeroSlide);
router.put('/reorder', protect, adminOnly, reorderHeroSlides);
router.put('/:id', protect, adminOnly, uploadHeroImages.single('image'), updateHeroSlide);
router.delete('/:id', protect, adminOnly, deleteHeroSlide);

export default router;
