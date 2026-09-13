import express from 'express';
import {
  getSettings,
  updateSettings,
  validatePromoCode,
} from '../controllers/settingsController.js';
import { protect, adminOnly, optionalAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getSettings)
  .put(protect, adminOnly, updateSettings);

router.route('/validate-promo')
  .post(optionalAuth, validatePromoCode);

export default router;
