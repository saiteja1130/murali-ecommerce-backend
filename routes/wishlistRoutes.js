import express from 'express';
import {
  getWishlist,
  toggleWishlist,
  syncWishlist,
  removeFromWishlist,
  clearWishlist,
} from '../controllers/wishlistController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All wishlist routes are protected
router.use(protect);

router.route('/')
  .get(getWishlist)
  .delete(clearWishlist);

router.post('/toggle', toggleWishlist);
router.post('/sync', syncWishlist);
router.delete('/:productId', removeFromWishlist);

export default router;
