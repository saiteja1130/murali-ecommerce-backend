import express from 'express';
import { protect, adminOnly } from '../middlewares/authMiddleware.js';
import {
  getHeroSlides,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  reorderHeroSlides,
} from '../controllers/heroController.js';

const router = express.Router();

router.get('/', getHeroSlides); // Publicly accessible for the storefront
router.post('/', protect, adminOnly, createHeroSlide);
router.put('/reorder', protect, adminOnly, reorderHeroSlides);
router.put('/:id', protect, adminOnly, updateHeroSlide);
router.delete('/:id', protect, adminOnly, deleteHeroSlide);

export default router;
