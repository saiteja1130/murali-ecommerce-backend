import express from 'express';
import {
  createRazorpayOrder,
  verifyPayment,
  handleRazorpayPostCallback,
  createCodOrder,
  getMyOrders,
  getOrderById,
  cancelMyOrder,
  getAllOrders,
  updateOrderStatus,
  updateTrackingNumber,
} from '../controllers/orderController.js';
import { protect, adminOnly } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public callback for Razorpay (Used by mobile Intent flow)
router.post('/razorpay-callback', handleRazorpayPostCallback);

// Customer Order Lifecycle
router.post('/create-razorpay-order', protect, createRazorpayOrder);
router.post('/verify-payment', protect, verifyPayment);
router.post('/cod', protect, createCodOrder);
router.get('/my-orders', protect, getMyOrders);
router.get('/:id', protect, getOrderById);
router.patch('/:id/cancel', protect, cancelMyOrder);

// Admin Order Management
router.get('/', protect, adminOnly, getAllOrders);
router.patch('/:id/status', protect, adminOnly, updateOrderStatus);
router.patch('/:id/tracking', protect, adminOnly, updateTrackingNumber);

export default router;
