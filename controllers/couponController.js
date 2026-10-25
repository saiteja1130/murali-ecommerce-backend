import Coupon from '../models/Coupon.js';
import Category from '../models/Category.js';
import Order from '../models/Order.js';

/**
 * @desc    Get all coupons (Admin)
 * @route   GET /api/coupons
 * @access  Private/Admin
 */
export const getCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find()
      .populate('applicableCategories', 'name slug')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: true,
      count: coupons.length,
      data: coupons,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single coupon by ID
 * @route   GET /api/coupons/:id
 * @access  Private/Admin
 */
export const getCouponById = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
      .populate('applicableCategories', 'name slug');

    if (!coupon) {
      return res.status(404).json({
        status: false,
        message: 'Coupon not found',
      });
    }

    res.status(200).json({
      status: true,
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new promotional coupon
 * @route   POST /api/coupons
 * @access  Private/Admin
 */
export const createCoupon = async (req, res, next) => {
  try {
    const {
      code,
      description,
      discountType = 'percentage',
      discountValue,
      minSpend = 0,
      maxDiscount = null,
      isAllCategories = false,
      applicableCategories = [],
      usageLimit = null,
      perUserLimit = 1,
      startDate = new Date(),
      endDate = null,
      isActive = true,
    } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({
        status: false,
        message: 'Please provide a coupon code',
      });
    }

    const cleanCode = code.trim().toUpperCase();

    const existing = await Coupon.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({
        status: false,
        message: `Coupon code "${cleanCode}" already exists`,
      });
    }

    // Resolve category slugs for applicableCategories
    let slugs = [];
    if (Array.isArray(applicableCategories) && applicableCategories.length > 0) {
      const foundCategories = await Category.find({ _id: { $in: applicableCategories } });
      slugs = foundCategories.map((c) => c.slug.toLowerCase());
    }

    const coupon = await Coupon.create({
      code: cleanCode,
      description: description || '',
      discountType,
      discountValue: Number(discountValue) || 0,
      minSpend: Number(minSpend) || 0,
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      isAllCategories: isAllCategories === true || isAllCategories === 'true',
      applicableCategories: isAllCategories ? [] : applicableCategories,
      applicableCategorySlugs: isAllCategories ? [] : slugs,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      perUserLimit: Number(perUserLimit) || 1,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      isActive: isActive !== false,
    });

    const populatedCoupon = await Coupon.findById(coupon._id).populate(
      'applicableCategories',
      'name slug'
    );

    res.status(201).json({
      status: true,
      message: `Coupon "${cleanCode}" created successfully`,
      data: populatedCoupon,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update coupon
 * @route   PUT /api/coupons/:id
 * @access  Private/Admin
 */
export const updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({
        status: false,
        message: 'Coupon not found',
      });
    }

    const {
      code,
      description,
      discountType,
      discountValue,
      minSpend,
      maxDiscount,
      isAllCategories,
      applicableCategories,
      usageLimit,
      perUserLimit,
      startDate,
      endDate,
      isActive,
    } = req.body;

    if (code && code.trim().toUpperCase() !== coupon.code) {
      const cleanCode = code.trim().toUpperCase();
      const duplicate = await Coupon.findOne({ code: cleanCode, _id: { $ne: coupon._id } });
      if (duplicate) {
        return res.status(400).json({
          status: false,
          message: `Coupon code "${cleanCode}" is already in use`,
        });
      }
      coupon.code = cleanCode;
    }

    if (description !== undefined) coupon.description = description;
    if (discountType !== undefined) coupon.discountType = discountType;
    if (discountValue !== undefined) coupon.discountValue = Number(discountValue);
    if (minSpend !== undefined) coupon.minSpend = Number(minSpend) || 0;
    if (maxDiscount !== undefined) coupon.maxDiscount = maxDiscount ? Number(maxDiscount) : null;
    if (isAllCategories !== undefined) coupon.isAllCategories = isAllCategories === true || isAllCategories === 'true';

    if (applicableCategories !== undefined) {
      if (coupon.isAllCategories) {
        coupon.applicableCategories = [];
        coupon.applicableCategorySlugs = [];
      } else {
        coupon.applicableCategories = applicableCategories;
        const foundCategories = await Category.find({ _id: { $in: applicableCategories } });
        coupon.applicableCategorySlugs = foundCategories.map((c) => c.slug.toLowerCase());
      }
    }

    if (usageLimit !== undefined) coupon.usageLimit = usageLimit ? Number(usageLimit) : null;
    if (perUserLimit !== undefined) coupon.perUserLimit = Number(perUserLimit) || 1;
    if (startDate !== undefined) coupon.startDate = startDate ? new Date(startDate) : coupon.startDate;
    if (endDate !== undefined) coupon.endDate = endDate ? new Date(endDate) : null;
    if (isActive !== undefined) coupon.isActive = isActive === true || isActive === 'true';

    await coupon.save();

    const updated = await Coupon.findById(coupon._id).populate('applicableCategories', 'name slug');

    res.status(200).json({
      status: true,
      message: `Coupon "${coupon.code}" updated successfully`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete coupon
 * @route   DELETE /api/coupons/:id
 * @access  Private/Admin
 */
export const deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({
        status: false,
        message: 'Coupon not found',
      });
    }

    await Coupon.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: true,
      message: `Coupon "${coupon.code}" was deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reusable helper: Evaluate a coupon against a list of verified or populated items
 * Checks active status, date range, user limits, and category eligibility.
 */
export const evaluateCouponForItems = async ({
  coupon,
  items = [],
  userId = null,
  cartSubtotal = 0,
}) => {
  if (!coupon || !coupon.isActive) {
    return {
      valid: false,
      message: 'This coupon is inactive or no longer valid.',
    };
  }

  const now = new Date();
  if (coupon.startDate && new Date(coupon.startDate) > now) {
    return {
      valid: false,
      message: `This coupon will become active on ${new Date(coupon.startDate).toLocaleDateString('en-IN')}.`,
    };
  }

  if (coupon.endDate && new Date(coupon.endDate) < now) {
    return {
      valid: false,
      message: 'This coupon has expired.',
    };
  }

  // Check total usage limit
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return {
      valid: false,
      message: 'This coupon has reached its maximum global usage limit.',
    };
  }

  // Check user redemption limit
  if (userId) {
    const previousRedemptions = await Order.countDocuments({
      user: userId,
      promoCode: coupon.code,
      orderStatus: { $ne: 'cancelled' },
    });

    const userLimit = coupon.perUserLimit || 1;
    if (previousRedemptions >= userLimit) {
      return {
        valid: false,
        alreadyUsed: true,
        message: `You have already redeemed coupon ${coupon.code}. This offer is limited to ${userLimit} use per customer.`,
      };
    }
  }

  // Determine Category Eligibility
  const isGlobal = coupon.isAllCategories || 
    (!coupon.applicableCategories?.length && !coupon.applicableCategorySlugs?.length);

  let eligibleItems = [];
  let nonEligibleItems = [];
  let eligibleSubtotal = 0;
  let totalSubtotal = 0;

  const applicableCatIds = (coupon.applicableCategories || []).map((c) =>
    (c._id || c).toString()
  );
  const applicableSlugs = (coupon.applicableCategorySlugs || []).map((s) =>
    s.toString().toLowerCase().trim()
  );

  for (const item of items) {
    const prod = item.product || {};
    const itemPrice = Number(item.price !== undefined ? item.price : (prod.price || 0));
    const qty = Number(item.quantity) || 1;
    const itemTotal = itemPrice * qty;
    totalSubtotal += itemTotal;

    if (isGlobal) {
      eligibleItems.push(item);
      eligibleSubtotal += itemTotal;
      continue;
    }

    // Inspect Category on Product
    let isItemMatch = false;
    const cat = prod.category;

    if (cat) {
      // 1. Direct Category ID match
      const catId = (cat._id || cat).toString();
      if (applicableCatIds.includes(catId)) {
        isItemMatch = true;
      }

      // 2. Category Slug match
      const catSlug = (typeof cat.slug === 'string' ? cat.slug : '').toLowerCase().trim();
      if (catSlug && applicableSlugs.includes(catSlug)) {
        isItemMatch = true;
      }

      // 3. Category Name match (e.g. "Sarees" matches slug "sarees")
      const catName = (typeof cat.name === 'string' ? cat.name : (typeof cat === 'string' ? cat : '')).toLowerCase().trim();
      if (catName) {
        if (applicableSlugs.includes(catName)) isItemMatch = true;
        // Plural / singular loose check (e.g., saree vs sarees)
        const singularName = catName.replace(/s$/, '');
        if (applicableSlugs.some((s) => s.replace(/s$/, '') === singularName)) {
          isItemMatch = true;
        }
      }
    }

    // 4. Fallback: Check MainCategory if available
    if (!isItemMatch && prod.mainCategory) {
      const mc = prod.mainCategory;
      const mcId = (mc._id || mc).toString();
      const mcSlug = (typeof mc.slug === 'string' ? mc.slug : '').toLowerCase().trim();
      if (applicableCatIds.includes(mcId) || (mcSlug && applicableSlugs.includes(mcSlug))) {
        isItemMatch = true;
      }
    }

    // 5. Fallback: Loose check in product name (e.g. Saree in product name)
    if (!isItemMatch && applicableSlugs.length > 0) {
      const prodName = (prod.name || item.name || '').toLowerCase();
      for (const slug of applicableSlugs) {
        const root = slug.replace(/s$/, '');
        if (root.length >= 4 && prodName.includes(root)) {
          isItemMatch = true;
          break;
        }
      }
    }

    if (isItemMatch) {
      eligibleItems.push(item);
      eligibleSubtotal += itemTotal;
    } else {
      nonEligibleItems.push(item);
    }
  }

  // Calculate Subtotal if items array was empty
  if (items.length === 0 && cartSubtotal > 0) {
    totalSubtotal = cartSubtotal;
    if (isGlobal) eligibleSubtotal = cartSubtotal;
  }

  // If category-specific coupon has NO matching items in bag
  if (!isGlobal && eligibleItems.length === 0) {
    // Build human-friendly category string
    let catNames = '';
    if (Array.isArray(coupon.applicableCategories) && coupon.applicableCategories.length > 0) {
      catNames = coupon.applicableCategories
        .map((c) => (typeof c === 'object' && c.name ? c.name : ''))
        .filter(Boolean)
        .join(', ');
    }
    if (!catNames && coupon.applicableCategorySlugs?.length) {
      catNames = coupon.applicableCategorySlugs
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(', ');
    }

    return {
      valid: false,
      message: `Coupon '${coupon.code}' is only applicable on ${catNames || 'selected categories'}. No matching items found in your shopping bag.`,
    };
  }

  // Check Minimum Spend
  const minSpendCheckValue = isGlobal ? totalSubtotal : eligibleSubtotal;
  if (coupon.minSpend > 0 && minSpendCheckValue < coupon.minSpend) {
    return {
      valid: false,
      message: `Minimum purchase of ₹${coupon.minSpend.toLocaleString('en-IN')} on qualifying items required for coupon ${coupon.code}.`,
    };
  }

  // Calculate Exact Discount Amount on Qualifying Items
  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = (eligibleSubtotal * coupon.discountValue) / 100;
    if (coupon.maxDiscount && coupon.maxDiscount > 0) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    }
  } else if (coupon.discountType === 'fixed') {
    discountAmount = Math.min(coupon.discountValue, eligibleSubtotal);
  }

  discountAmount = Math.round(discountAmount * 100) / 100;

  // Effective discount rate against the overall cart subtotal so standard clients calculate correctly
  const effectiveSubtotal = totalSubtotal > 0 ? totalSubtotal : (cartSubtotal > 0 ? cartSubtotal : eligibleSubtotal);
  const effectiveDiscountRate = effectiveSubtotal > 0 ? (discountAmount / effectiveSubtotal) : 0;
  const effectiveDiscountPercent = Math.round(effectiveDiscountRate * 100 * 100) / 100;

  // Build targeted success message
  let targetLabel = 'your order';
  if (!isGlobal) {
    const matchedNames = coupon.applicableCategories
      ?.map((c) => (c.name ? c.name : ''))
      .filter(Boolean);
    if (matchedNames && matchedNames.length > 0) {
      targetLabel = matchedNames.join(', ');
    } else if (coupon.applicableCategorySlugs?.length) {
      targetLabel = coupon.applicableCategorySlugs.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ');
    } else {
      targetLabel = 'qualifying items';
    }
  }

  const successMessage = coupon.discountType === 'percentage'
    ? `Promo code ${coupon.code} applied! ${coupon.discountValue}% OFF on ${targetLabel} (₹${discountAmount.toLocaleString('en-IN')} discount applied)`
    : `Promo code ${coupon.code} applied! ₹${discountAmount.toLocaleString('en-IN')} OFF on ${targetLabel}`;

  return {
    valid: true,
    code: coupon.code,
    coupon,
    discountAmount,
    discountRate: effectiveDiscountRate,
    discountPercent: effectiveDiscountPercent,
    nominalPercent: coupon.discountType === 'percentage' ? coupon.discountValue : effectiveDiscountPercent,
    eligibleSubtotal,
    totalSubtotal: effectiveSubtotal,
    isGlobal,
    eligibleCount: eligibleItems.length,
    message: successMessage,
  };
};
