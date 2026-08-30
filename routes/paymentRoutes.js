import express from 'express';
import {
  getMyPayments,
  getAllPayments,
  handleRazorpayWebhook,
  reconcilePayment,
} from '../controllers/paymentController.js';
import { protect, adminOnly } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Razorpay Server-to-Server Webhook (Public, signature-verified)
router.post('/webhook', handleRazorpayWebhook);

// Admin Reconcile payment status
router.post('/reconcile', protect, adminOnly, reconcilePayment);

// Customer personal payment history
router.get('/my-payments', protect, getMyPayments);

// Admin platform payment histories & metrics
router.get('/', protect, adminOnly, getAllPayments);

export default router;
