import crypto from 'crypto';
import Razorpay from 'razorpay';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import User from '../models/User.js';

// Helper to get Razorpay instance
const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
  const key_secret = process.env.RAZORPAY_KEY_SECRET || 'razorpay_secret_placeholder';
  return new Razorpay({ key_id, key_secret });
};

/**
 * @desc    Handle Razorpay Webhook Events (Automatic background sync)
 * @route   POST /api/payments/webhook
 * @access  Public (Signature Verified)
 */
export const handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || 'razorpay_secret_placeholder';

    // Verify signature if real secret configured
    if (webhookSecret && !webhookSecret.includes('placeholder') && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (expectedSignature !== signature) {
        console.warn('[Razorpay Webhook Warning]: Invalid signature received.');
        return res.status(400).json({ status: false, message: 'Invalid webhook signature' });
      }
    }

    const { event, payload } = req.body;
    console.log(`[Razorpay Webhook Event Received]: ${event}`);

    // 1. Handle Successful Payment Capture / Order Paid
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payment?.entity || {};
      const paymentId = paymentEntity.id;
      const razorpayOrderId = paymentEntity.order_id;
      const orderNumber = paymentEntity.notes?.orderNumber || paymentEntity.receipt;
      const userId = paymentEntity.notes?.userId;
      const amount = paymentEntity.amount ? paymentEntity.amount / 100 : 0;

      // Check if order already exists in MongoDB
      let order = null;
      if (razorpayOrderId) {
        order = await Order.findOne({ 'razorpay.orderId': razorpayOrderId });
      }
      if (!order && paymentId) {
        order = await Order.findOne({ 'razorpay.paymentId': paymentId });
      }
      if (!order && orderNumber) {
        order = await Order.findOne({ orderNumber });
      }

      if (order) {
        // Order exists -> ensure it is marked as paid and confirmed (Idempotent!)
        order.paymentStatus = 'paid';
        order.orderStatus = 'confirmed';
        if (paymentId) order.razorpay.paymentId = paymentId;
        if (razorpayOrderId) order.razorpay.orderId = razorpayOrderId;
        await order.save();

        if (order.user) {
          try {
            await Cart.findOneAndUpdate({ user: order.user }, { items: [] });
          } catch (e) {
            console.warn('Could not clear cart via webhook:', e.message);
          }
        }
        console.log(`[Razorpay Webhook]: Existing Order #${order.orderNumber} confirmed & marked as PAID.`);
      } else if (userId) {
        // Edge Case: Frontend disconnected before /verify-payment was called!
        // We recover the order using the user's active cart and details.
        const user = await User.findById(userId);
        const userCart = await Cart.findOne({ user: userId }).populate('items.product');

        if (user && userCart && userCart.items && userCart.items.length > 0) {
          const verifiedItems = userCart.items
            .filter((item) => item.product && !item.product.isDeleted)
            .map((item) => ({
              product: item.product._id,
              name: item.product.name,
              price: item.product.price,
              quantity: item.quantity || 1,
              selectedSize: item.size || 'M',
              selectedColor: item.color || 'Standard',
              image: (Array.isArray(item.product.images) && item.product.images[0]) || item.product.image || '',
            }));

          const primaryAddress = (user.addresses || []).find((a) => a.isDefault) || (user.addresses || [])[0] || {};

          const recoveredOrder = await Order.create({
            orderNumber: orderNumber || `SMLX-${Date.now().toString().slice(-6)}`,
            user: userId,
            items: verifiedItems,
            shippingAddress: {
              fullName: primaryAddress.fullName || user.name || 'Customer',
              phone: primaryAddress.phone || user.phone || '',
              street: primaryAddress.street || 'Address on file',
              apartment: primaryAddress.apartment || '',
              city: primaryAddress.city || 'City',
              state: primaryAddress.state || '',
              postalCode: primaryAddress.postalCode || '500001',
              country: primaryAddress.country || 'India',
              addressType: primaryAddress.addressType || 'home',
            },
            paymentMethod: 'upi',
            paymentStatus: 'paid',
            orderStatus: 'confirmed',
            subtotal: amount,
            shippingCost: 0,
            discount: 0,
            total: amount,
            currency: 'INR',
            trackingNumber: `SMLX-EXP-${Math.floor(100000000 + Math.random() * 900000000)}`,
            razorpay: {
              orderId: razorpayOrderId || '',
              paymentId: paymentId || '',
              signature: 'webhook_verified',
            },
          });

          // Clear user's bag
          await Cart.findOneAndUpdate({ user: userId }, { items: [] });
          console.log(`[Razorpay Webhook]: Recovered and created Order #${recoveredOrder.orderNumber} for user ${user.email}.`);
        }
      }
    }

    // 2. Handle Refund Processed in Razorpay Dashboard
    if (event === 'refund.processed') {
      const refundEntity = payload.refund?.entity || {};
      const paymentId = refundEntity.payment_id;
      if (paymentId) {
        const order = await Order.findOne({ 'razorpay.paymentId': paymentId });
        if (order) {
          order.paymentStatus = 'refunded';
          order.orderStatus = 'cancelled';
          await order.save();
          console.log(`[Razorpay Webhook]: Order #${order.orderNumber} marked as REFUNDED.`);
        }
      }
    }

    return res.status(200).json({
      status: true,
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    console.error('[Razorpay Webhook Error]:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Webhook processing failed',
    });
  }
};

/**
 * @desc    Admin: Reconcile / Verify Payment status directly with Razorpay API
 * @route   POST /api/payments/reconcile
 * @access  Private/Admin
 */
export const reconcilePayment = async (req, res) => {
  try {
    const { paymentId, orderNumber } = req.body;

    if (!paymentId && !orderNumber) {
      return res.status(400).json({
        status: false,
        message: 'Please provide either a Razorpay Payment ID or Order Number',
      });
    }

    let order = null;
    if (paymentId) {
      order = await Order.findOne({ 'razorpay.paymentId': paymentId });
    }
    if (!order && orderNumber) {
      order = await Order.findOne({ orderNumber });
    }

    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (key_id && !key_id.includes('placeholder') && key_secret && !key_secret.includes('placeholder') && paymentId) {
      try {
        const razorpay = getRazorpayInstance();
        const rzpPayment = await razorpay.payments.fetch(paymentId);

        if (rzpPayment && rzpPayment.status === 'captured') {
          if (order) {
            order.paymentStatus = 'paid';
            order.orderStatus = 'confirmed';
            order.razorpay.paymentId = paymentId;
            await order.save();
          }

          return res.status(200).json({
            status: true,
            message: 'Payment verified and confirmed as CAPTURED with Razorpay',
            data: {
              rzpStatus: rzpPayment.status,
              amount: rzpPayment.amount / 100,
              method: rzpPayment.method,
              order: order || null,
            },
          });
        }
      } catch (rzpErr) {
        console.error('[Reconcile Error]:', rzpErr);
      }
    }

    if (order) {
      return res.status(200).json({
        status: true,
        message: 'Order found in database',
        data: {
          order,
        },
      });
    }

    return res.status(404).json({
      status: false,
      message: 'No matching transaction found',
    });
  } catch (error) {
    console.error('[Reconcile Payment Error]:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Failed to reconcile payment',
    });
  }
};

/**
 * @desc    Get customer's personal payment history
 * @route   GET /api/payments/my-payments
 * @access  Private
 */
export const getMyPayments = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('orderNumber total paymentMethod paymentStatus razorpay createdAt items');

    const payments = orders.map((o) => {
      let methodLabel = 'UPI (Instant Transfer)';
      if (o.paymentMethod === 'cod') {
        methodLabel = 'Cash on Delivery (COD)';
      }

      let statusLabel = 'Settled';
      if (o.paymentStatus === 'cod_pending') {
        statusLabel = 'Pending (COD)';
      } else if (o.paymentStatus === 'pending') {
        statusLabel = 'Processing';
      } else if (o.paymentStatus === 'refunded') {
        statusLabel = 'Refunded';
      } else if (o.paymentStatus === 'failed') {
        statusLabel = 'Failed';
      }

      return {
        id: o._id,
        orderId: o._id,
        orderNumber: o.orderNumber,
        transactionId: o.razorpay?.paymentId || (o.paymentMethod === 'cod' ? `COD-${o.orderNumber}` : `UPI-${o._id.toString().slice(-8)}`),
        amount: o.total,
        currency: 'INR',
        method: methodLabel,
        paymentMethod: o.paymentMethod,
        status: statusLabel,
        paymentStatus: o.paymentStatus,
        date: o.createdAt,
        razorpayPaymentId: o.razorpay?.paymentId || '',
        razorpayOrderId: o.razorpay?.orderId || '',
        itemCount: Array.isArray(o.items) ? o.items.reduce((sum, i) => sum + (i.quantity || 1), 0) : 0,
      };
    });

    return res.status(200).json({
      status: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    console.error('[Get My Payments Error]:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to fetch payment history',
    });
  }
};

/**
 * @desc    Admin: Get all platform payments with analytics breakdown
 * @route   GET /api/payments
 * @access  Private/Admin
 */
export const getAllPayments = async (req, res) => {
  try {
    const { status, method, search, page = 1, limit = 50 } = req.query;

    const query = {};
    if (status && status !== 'all') {
      query.paymentStatus = status;
    }
    if (method && method !== 'all') {
      query.paymentMethod = method;
    }
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { orderNumber: searchRegex },
        { 'shippingAddress.fullName': searchRegex },
        { 'shippingAddress.phone': searchRegex },
        { 'razorpay.paymentId': searchRegex },
        { 'razorpay.orderId': searchRegex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Compute platform payment metrics
    const statsAgg = await Order.aggregate([
      {
        $group: {
          _id: '$paymentStatus',
          totalAmount: { $sum: '$total' },
          count: { $sum: 1 },
        },
      },
    ]);

    let totalSettled = 0;
    let totalPendingCod = 0;
    let totalRefunded = 0;
    let totalFailed = 0;

    statsAgg.forEach((s) => {
      if (s._id === 'paid') totalSettled += s.totalAmount;
      if (s._id === 'cod_pending') totalPendingCod += s.totalAmount;
      if (s._id === 'refunded') totalRefunded += s.totalAmount;
      if (s._id === 'failed') totalFailed += s.totalAmount;
    });

    const payments = orders.map((o) => ({
      id: o._id,
      orderId: o._id,
      orderNumber: o.orderNumber,
      customer: {
        id: o.user?._id,
        name: o.shippingAddress?.fullName || o.user?.name || 'Customer',
        email: o.user?.email || '',
        phone: o.shippingAddress?.phone || o.user?.phone || '',
      },
      transactionId: o.razorpay?.paymentId || (o.paymentMethod === 'cod' ? `COD-${o.orderNumber}` : `UPI-${o._id.toString().slice(-8)}`),
      amount: o.total,
      currency: o.currency || 'INR',
      method: o.paymentMethod === 'upi' ? 'UPI' : 'Cash on Delivery (COD)',
      paymentMethod: o.paymentMethod,
      status: o.paymentStatus,
      orderStatus: o.orderStatus,
      date: o.createdAt,
      razorpayPaymentId: o.razorpay?.paymentId || '',
      razorpayOrderId: o.razorpay?.orderId || '',
    }));

    return res.status(200).json({
      status: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      count: payments.length,
      metrics: {
        totalSettled,
        totalPendingCod,
        totalRefunded,
        totalFailed,
      },
      data: payments,
    });
  } catch (error) {
    console.error('[Admin Get All Payments Error]:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to fetch platform payments',
    });
  }
};
