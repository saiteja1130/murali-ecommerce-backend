import express from 'express';
import {
  getCart,
  addToCart,
  updateCartQuantity,
  removeCartItem,
  clearCart,
  mergeCart,
} from '../controllers/cartController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All cart routes require user authentication
router.use(protect);

router.route('/')
  .get(getCart);

router.post('/add', addToCart);
router.put('/update', updateCartQuantity);
router.delete('/item/:cartItemId', removeCartItem);
router.delete('/clear', clearCart);
router.post('/merge', mergeCart);

export default router;
