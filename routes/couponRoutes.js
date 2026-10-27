import express from 'express';
import {
  getCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getLatestActiveCoupon,
} from '../controllers/couponController.js';
import { protect, adminOnly } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public route to fetch latest active coupon for mobile & storefront announcement banners
router.get('/latest', getLatestActiveCoupon);

router.use(protect, adminOnly);

router.route('/')
  .get(getCoupons)
  .post(createCoupon);

router.route('/:id')
  .get(getCouponById)
  .put(updateCoupon)
  .delete(deleteCoupon);

export default router;
