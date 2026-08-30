import crypto from 'crypto';
import Razorpay from 'razorpay';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Settings from '../models/Settings.js';
import Cart from '../models/Cart.js';

// Helper to get or instantiate Razorpay client
const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
  const key_secret = process.env.RAZORPAY_KEY_SECRET || 'razorpay_secret_placeholder';
  return new Razorpay({ key_id, key_secret });
};

// Generate unique order number SMLX-XXXXXX
const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-5);
  const random = Math.floor(100 + Math.random() * 900);
  return `SMLX-${timestamp}${random}`;
};

// Calculate verified server-side totals
const calculateOrderTotals = async (rawItems, promoCodeInput) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('Your bag is empty');
  }

  const settings = await Settings.getSingleton();
  const verifiedItems = [];
  let subtotal = 0;

  for (const item of rawItems) {
    const productId = item.product?._id || item.product?.id || item.product || item.id;
    const quantity = Math.max(1, Number(item.quantity) || 1);

    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      throw new Error(`Product ${item.name || 'item'} is no longer available`);
    }

    if (product.isStockAvailable === false) {
      throw new Error(`Product "${product.name}" is currently out of stock`);
    }

    const price = Number(product.price) || 0;
    const itemTotal = price * quantity;
    subtotal += itemTotal;

    const primaryImage =
      (Array.isArray(product.images) && product.images[0]) ||
      item.image ||
      '';

    verifiedItems.push({
      product: product._id,
      name: product.name,
      price: price,
      quantity: quantity,
      selectedSize: item.selectedSize || 'Standard',
      selectedColor: item.selectedColor || { name: 'Standard', hex: '#1D241C' },
      image: primaryImage,
      sku: product.sku || '',
    });
  }

  // Promo Code Validation
  let discount = 0;
  let activePromo = '';
  if (promoCodeInput && settings.isPromoActive) {
    const cleanPromo = promoCodeInput.trim().toUpperCase();
    if (cleanPromo === (settings.promoCode || '').toUpperCase()) {
      discount = (subtotal * (settings.discountPercent || 0)) / 100;
      activePromo = cleanPromo;
    }
  }

  // Shipping Calculation
  const freeThreshold = settings.freeShippingThreshold !== undefined ? settings.freeShippingThreshold : 5000;
  const standardFee = settings.shippingFee !== undefined ? settings.shippingFee : 30;
  const shippingCost = subtotal >= freeThreshold || verifiedItems.length === 0 ? 0 : standardFee;

  const total = Math.max(0, subtotal - discount + shippingCost);

  return {
    verifiedItems,
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    shippingCost: Math.round(shippingCost * 100) / 100,
    total: Math.round(total * 100) / 100,
    promoCode: activePromo,
    settings,
  };
};

/**
 * @desc    Initiate Razorpay Gateway Order for UPI payment (Does NOT create DB order until verified)
 * @route   POST /api/orders/create-razorpay-order
 * @access  Private
 */
export const createRazorpayOrder = async (req, res) => {
  try {
    const { items, shippingAddress, promoCode } = req.body;

    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.street || !shippingAddress.city || !shippingAddress.postalCode) {
      return res.status(400).json({
        status: false,
        message: 'Please provide a complete shipping address',
      });
    }

    const { total } = await calculateOrderTotals(items, promoCode);
    const orderNumber = generateOrderNumber();
    const amountInPaise = Math.round(total * 100);

    const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'razorpay_secret_placeholder';

    let razorpayOrderId = '';

    // Create real Razorpay order if valid keys are configured
    if (key_id && !key_id.includes('placeholder') && key_secret && !key_secret.includes('placeholder')) {
      try {
        const razorpay = getRazorpayInstance();
        const razorpayOrder = await razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: orderNumber,
          notes: {
            orderNumber: orderNumber,
            userId: req.user._id.toString(),
            customerEmail: req.user.email || '',
            paymentType: 'UPI_STANDARD',
          },
        });
        razorpayOrderId = razorpayOrder.id;
      } catch (rzpErr) {
        console.error('[Razorpay Order Creation Error]:', rzpErr);
        return res.status(502).json({
          status: false,
          message: `Razorpay Gateway Error: ${rzpErr.error?.description || rzpErr.message}`,
        });
      }
    } else {
      // Local dev simulation fallback
      razorpayOrderId = `order_sim_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    return res.status(200).json({
      status: true,
      message: 'Payment session initiated',
      data: {
        orderNumber: orderNumber,
        razorpayOrderId: razorpayOrderId,
        amount: amountInPaise,
        currency: 'INR',
        key_id: key_id,
        total: total,
      },
    });
  } catch (error) {
    console.error('[Create Razorpay Order Error]:', error);
    return res.status(400).json({
      status: false,
      message: error.message || 'Failed to initiate payment session',
    });
  }
};

/**
 * @desc    Verify Razorpay Payment signature and create confirmed order in MongoDB
 * @route   POST /api/orders/verify-payment
 * @access  Private
 */
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderNumber,
      items,
      shippingAddress,
      promoCode,
      notes,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({
        status: false,
        message: 'Missing Razorpay payment parameters',
      });
    }

    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'razorpay_secret_placeholder';
    let isSignatureValid = false;

    if (key_secret && !key_secret.includes('placeholder')) {
      const generatedSignature = crypto
        .createHmac('sha256', key_secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      isSignatureValid = generatedSignature === razorpay_signature;
    } else {
      // Local dev simulation auto-passes
      isSignatureValid = true;
    }

    if (!isSignatureValid) {
      return res.status(400).json({
        status: false,
        message: 'Payment verification failed: Signature mismatch',
      });
    }

    // Calculate verified server-side totals
    const { verifiedItems, subtotal, discount, shippingCost, total, promoCode: activePromo } =
      await calculateOrderTotals(items, promoCode);

    const finalOrderNumber = orderNumber || generateOrderNumber();

    // Create the confirmed Order in MongoDB (Only created upon verified payment!)
    const order = await Order.create({
      orderNumber: finalOrderNumber,
      user: req.user._id,
      items: verifiedItems,
      shippingAddress: {
        fullName: shippingAddress?.fullName || req.user.name || 'Customer',
        phone: shippingAddress?.phone || req.user.phone || '',
        street: shippingAddress?.street || '',
        apartment: shippingAddress?.apartment || '',
        city: shippingAddress?.city || '',
        state: shippingAddress?.state || '',
        postalCode: shippingAddress?.postalCode || '',
        country: shippingAddress?.country || 'India',
        addressType: shippingAddress?.addressType || 'home',
      },
      paymentMethod: 'upi',
      paymentStatus: 'paid',
      orderStatus: 'confirmed',
      subtotal,
      shippingCost,
      discount,
      promoCode: activePromo,
      total,
      currency: 'INR',
      trackingNumber: `SMLX-EXP-${Math.floor(100000000 + Math.random() * 900000000)}`,
      notes: notes || '',
      razorpay: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature || '',
      },
    });

    // Clear user's bag in MongoDB
    try {
      await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
    } catch (cartErr) {
      console.warn('Could not clear bag after order confirmation:', cartErr.message);
    }

    return res.status(201).json({
      status: true,
      message: 'Payment verified and order confirmed successfully',
      data: order,
    });
  } catch (error) {
    console.error('[Verify Payment Error]:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Payment verification failed',
    });
  }
};

/**
 * @desc    Create Cash on Delivery (COD) order
 * @route   POST /api/orders/cod
 * @access  Private
 */
export const createCodOrder = async (req, res) => {
  try {
    const { items, shippingAddress, promoCode, notes } = req.body;

    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.street || !shippingAddress.city || !shippingAddress.postalCode) {
      return res.status(400).json({
        status: false,
        message: 'Please provide a complete shipping address',
      });
    }

    const { verifiedItems, subtotal, discount, shippingCost, total, promoCode: activePromo } =
      await calculateOrderTotals(items, promoCode);

    const orderNumber = generateOrderNumber();

    const order = await Order.create({
      orderNumber,
      user: req.user._id,
      items: verifiedItems,
      shippingAddress: {
        fullName: shippingAddress.fullName,
        phone: shippingAddress.phone || req.user.phone || '',
        street: shippingAddress.street,
        apartment: shippingAddress.apartment || '',
        city: shippingAddress.city,
        state: shippingAddress.state || '',
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country || 'India',
        addressType: shippingAddress.addressType || 'home',
      },
      paymentMethod: 'cod',
      paymentStatus: 'cod_pending',
      orderStatus: 'confirmed',
      subtotal,
      shippingCost,
      discount,
      promoCode: activePromo,
      total,
      currency: 'INR',
      trackingNumber: `SMLX-EXP-${Math.floor(100000000 + Math.random() * 900000000)}`,
      notes: notes || '',
    });

    // Clear user's bag in MongoDB
    try {
      await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
    } catch (cartErr) {
      console.warn('Could not clear bag after COD order:', cartErr.message);
    }

    return res.status(201).json({
      status: true,
      message: 'Cash on Delivery order placed successfully',
      data: order,
    });
  } catch (error) {
    console.error('[Create COD Order Error]:', error);
    return res.status(400).json({
      status: false,
      message: error.message || 'Failed to place COD order',
    });
  }
};

/**
 * @desc    Get logged in user orders
 * @route   GET /api/orders/my-orders
 * @access  Private
 */
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({
      status: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error('[Get My Orders Error]:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to fetch your orders',
    });
  }
};

/**
 * @desc    Get single order by ID or orderNumber
 * @route   GET /api/orders/:id
 * @access  Private
 */
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    let order = null;

    if (id.startsWith('SMLX-')) {
      order = await Order.findOne({ orderNumber: id }).populate('user', 'name email phone');
    } else {
      order = await Order.findById(id).populate('user', 'name email phone');
    }

    if (!order) {
      return res.status(404).json({
        status: false,
        message: 'Order not found',
      });
    }

    // Check authorization: Owner or Admin
    const orderOwnerId = (order.user?._id || order.user || '').toString();
    if (orderOwnerId !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        status: false,
        message: 'Not authorized to view this order',
      });
    }

    return res.status(200).json({
      status: true,
      data: order,
    });
  } catch (error) {
    console.error('[Get Order By ID Error]:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to fetch order details',
    });
  }
};

/**
 * @desc    Customer cancel own order (only if pending or confirmed)
 * @route   PATCH /api/orders/:id/cancel
 * @access  Private
 */
export const cancelMyOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        status: false,
        message: 'Order not found',
      });
    }

    const orderOwnerId = (order.user?._id || order.user || '').toString();
    if (orderOwnerId !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        status: false,
        message: 'Not authorized to cancel this order',
      });
    }

    if (!['pending', 'confirmed'].includes(order.orderStatus)) {
      return res.status(400).json({
        status: false,
        message: `Order cannot be cancelled in "${order.orderStatus}" status. Please contact concierge support.`,
      });
    }

    if (['pending', 'failed'].includes(order.paymentStatus) && order.orderStatus === 'pending') {
      await Order.findByIdAndDelete(id);
      return res.status(200).json({
        status: true,
        message: 'Incomplete or failed checkout session removed successfully',
      });
    }

    order.orderStatus = 'cancelled';
    if (order.paymentStatus === 'paid') {
      order.paymentStatus = 'refunded';
    }
    await order.save();

    return res.status(200).json({
      status: true,
      message: 'Order cancelled successfully',
      data: order,
    });
  } catch (error) {
    console.error('[Cancel Order Error]:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Failed to cancel order',
    });
  }
};

/**
 * @desc    Admin: Get all orders with search, filters & pagination
 * @route   GET /api/orders
 * @access  Private/Admin
 */
export const getAllOrders = async (req, res) => {
  try {
    const { status, paymentStatus, paymentMethod, search, page = 1, limit = 50 } = req.query;

    const query = {};

    if (status && status !== 'all') {
      query.orderStatus = status;
    }
    if (paymentStatus && paymentStatus !== 'all') {
      query.paymentStatus = paymentStatus;
    }
    if (paymentMethod && paymentMethod !== 'all') {
      query.paymentMethod = paymentMethod;
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

    return res.status(200).json({
      status: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error('[Admin Get All Orders Error]:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to fetch orders',
    });
  }
};

/**
 * @desc    Admin: Update order status with state machine enforcement
 * @route   PATCH /api/orders/:id/status
 * @access  Private/Admin
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus, paymentStatus } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        status: false,
        message: 'Order not found',
      });
    }

    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered', 'returned'],
      delivered: ['returned'],
      cancelled: [],
      returned: [],
    };

    if (orderStatus && orderStatus !== order.orderStatus) {
      const allowedNext = validTransitions[order.orderStatus] || [];
      if (!allowedNext.includes(orderStatus) && req.user.role !== 'admin') {
        return res.status(400).json({
          status: false,
          message: `Illegal transition from "${order.orderStatus}" to "${orderStatus}"`,
        });
      }
      order.orderStatus = orderStatus;

      // Auto-update payment status on delivery for COD
      if (orderStatus === 'delivered' && order.paymentStatus === 'cod_pending') {
        order.paymentStatus = 'paid';
      }
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }

    await order.save();

    return res.status(200).json({
      status: true,
      message: 'Order status updated successfully',
      data: order,
    });
  } catch (error) {
    console.error('[Update Order Status Error]:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Failed to update order status',
    });
  }
};

/**
 * @desc    Admin: Update shipping tracking number
 * @route   PATCH /api/orders/:id/tracking
 * @access  Private/Admin
 */
export const updateTrackingNumber = async (req, res) => {
  try {
    const { id } = req.params;
    const { trackingNumber, shippingMethod, estimatedDelivery } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        status: false,
        message: 'Order not found',
      });
    }

    if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
    if (shippingMethod !== undefined) order.shippingMethod = shippingMethod;
    if (estimatedDelivery !== undefined) order.estimatedDelivery = estimatedDelivery;

    await order.save();

    return res.status(200).json({
      status: true,
      message: 'Tracking details updated successfully',
      data: order,
    });
  } catch (error) {
    console.error('[Update Tracking Error]:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Failed to update tracking details',
    });
  }
};
