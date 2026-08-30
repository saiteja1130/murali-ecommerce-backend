import express from 'express';
import {
  getSettings,
  updateSettings,
  validatePromoCode,
} from '../controllers/settingsController.js';
import { protect, adminOnly } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getSettings)
  .put(protect, adminOnly, updateSettings);

router.route('/validate-promo')
  .post(validatePromoCode);

export default router;
