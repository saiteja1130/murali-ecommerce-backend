import Settings from '../models/Settings.js';
import Order from '../models/Order.js';
import Coupon from '../models/Coupon.js';
import Cart from '../models/Cart.js';
import { evaluateCouponForItems } from './couponController.js';

/**
 * @desc    Get store settings (shipping, threshold, promo)
 * @route   GET /api/settings
 * @access  Public
 */
export const getSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getSingleton();
    res.status(200).json({
      status: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update store settings
 * @route   PUT /api/settings
 * @access  Private/Admin
 */
export const updateSettings = async (req, res, next) => {
  try {
    const {
      shippingFee,
      freeShippingThreshold,
      promoCode,
      discountPercent,
      isPromoActive,
      currency,
      storeName,
      isCodEnabled,
      maxCodAmount,
    } = req.body;

    let settings = await Settings.getSingleton();

    if (shippingFee !== undefined) settings.shippingFee = Math.max(0, Number(shippingFee));
    if (freeShippingThreshold !== undefined) settings.freeShippingThreshold = Math.max(0, Number(freeShippingThreshold));
    if (promoCode !== undefined) settings.promoCode = promoCode.trim().toUpperCase();
    if (discountPercent !== undefined) settings.discountPercent = Math.min(100, Math.max(0, Number(discountPercent)));
    if (isPromoActive !== undefined) settings.isPromoActive = isPromoActive === 'true' || isPromoActive === true;
    if (currency !== undefined) settings.currency = currency;
    if (storeName !== undefined) settings.storeName = storeName;
    if (isCodEnabled !== undefined) settings.isCodEnabled = isCodEnabled === 'true' || isCodEnabled === true;
    if (maxCodAmount !== undefined) settings.maxCodAmount = Math.max(0, Number(maxCodAmount));

    await settings.save();

    res.status(200).json({
      status: true,
      message: 'Store settings updated successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Validate promotional coupon code (Ensures one-time usage per user)
 * @route   POST /api/settings/validate-promo
 * @access  Public / OptionalAuth
 */
export const validatePromoCode = async (req, res, next) => {
  try {
    const { code, items } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({
        status: false,
        message: 'Please provide a promotional code',
      });
    }

    const inputCode = code.trim().toUpperCase();

    // 1. Check Coupon collection first
    const matchedCoupon = await Coupon.findOne({ code: inputCode, isActive: true }).populate(
      'applicableCategories',
      'name slug'
    );

    if (matchedCoupon) {
      let cartItems = Array.isArray(items) ? items : [];

      // If items weren't directly provided in request, fetch authenticated user's cart from DB
      if (cartItems.length === 0 && req.user && req.user._id) {
        const userCart = await Cart.findOne({ user: req.user._id }).populate({
          path: 'items.product',
          populate: [
            { path: 'category', select: 'name slug' },
            { path: 'mainCategory', select: 'name slug' },
          ],
        });
        if (userCart && Array.isArray(userCart.items)) {
          cartItems = userCart.items;
        }
      }

      const evalResult = await evaluateCouponForItems({
        coupon: matchedCoupon,
        items: cartItems,
        userId: req.user?._id,
      });

      if (!evalResult.valid) {
        return res.status(400).json({
          status: false,
          valid: false,
          alreadyUsed: evalResult.alreadyUsed || false,
          message: evalResult.message,
        });
      }

      return res.status(200).json({
        status: true,
        valid: true,
        code: matchedCoupon.code,
        discountPercent: evalResult.nominalPercent,
        discountRate: evalResult.discountRate,
        discountAmount: evalResult.discountAmount,
        message: evalResult.message,
      });
    }

    // 2. Fallback to Settings.promoCode (e.g. SUMI15)
    const settings = await Settings.getSingleton();

    if (settings.isPromoActive && settings.promoCode && inputCode === settings.promoCode) {
      if (req.user && req.user._id) {
        const previousUsage = await Order.findOne({
          user: req.user._id,
          promoCode: inputCode,
          orderStatus: { $ne: 'cancelled' },
        });

        if (previousUsage) {
          return res.status(400).json({
            status: false,
            valid: false,
            alreadyUsed: true,
            message: `You have already redeemed coupon ${settings.promoCode}. This offer is limited to one use per customer.`,
          });
        }
      }

      return res.status(200).json({
        status: true,
        valid: true,
        code: settings.promoCode,
        discountPercent: settings.discountPercent,
        discountRate: settings.discountPercent / 100,
        message: `Promo code ${settings.promoCode} applied! (${settings.discountPercent}% OFF)`,
      });
    }

    return res.status(400).json({
      status: false,
      valid: false,
      message: `Invalid or expired promotional code. Try using ${settings.promoCode || 'SUMI15'}`,
    });
  } catch (error) {
    next(error);
  }
};
