import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

// Helper to format cart response
const formatCartResponse = (cartDoc) => {
  if (!cartDoc) {
    return { items: [], totalItems: 0, subtotal: 0 };
  }

  const items = (cartDoc.items || [])
    .filter((item) => item.product && !item.product.isDeleted)
    .map((item) => {
      const prod = item.product;
      const price = typeof prod.price === 'number' ? prod.price : Number(prod.price) || 0;
      const isAvailable = prod.isStockAvailable !== false;

      return {
        id: item.cartItemId,
        cartItemId: item.cartItemId,
        _id: item._id,
        quantity: item.quantity,
        selectedSize: item.selectedSize || 'Standard',
        selectedColor: item.selectedColor || { name: 'Standard', hex: '#1D241C' },
        product: {
          id: prod._id,
          _id: prod._id,
          name: prod.name,
          slug: prod.slug,
          sku: prod.sku,
          price: price,
          originalPrice: prod.originalPrice,
          image: prod.images?.[0] || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=900',
          images: prod.images || [],
          category: prod.category?.name || 'Collection',
          isStockAvailable: isAvailable,
          totalStock: prod.variants?.reduce((acc, v) => acc + (v.stock || 0), 0) ?? (isAvailable ? 25 : 0),
        },
      };
    });

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  return {
    _id: cartDoc._id,
    user: cartDoc.user,
    items,
    totalItems,
    subtotal,
  };
};

/**
 * @desc    Get logged in user's cart
 * @route   GET /api/cart
 * @access  Private
 */
export const getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate({
      path: 'items.product',
      populate: { path: 'category', select: 'name slug' },
    });

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    res.status(200).json({
      status: true,
      message: 'Cart retrieved successfully',
      data: formatCartResponse(cart),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add item to logged in user's cart
 * @route   POST /api/cart/add
 * @access  Private
 */
export const addToCart = async (req, res, next) => {
  try {
    const { productId, selectedSize, selectedColor, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ status: false, message: 'Product ID is required' });
    }

    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      return res.status(404).json({ status: false, message: 'Product not found or unavailable' });
    }

    if (product.isStockAvailable === false) {
      return res.status(400).json({ status: false, message: 'Product is currently out of stock' });
    }

    const size = selectedSize || 'Standard';
    const color =
      typeof selectedColor === 'string'
        ? { name: selectedColor, hex: '#1D241C' }
        : selectedColor || { name: 'Standard', hex: '#1D241C' };

    const cartItemId = `${product._id}-${size}-${color.name || 'Standard'}`;
    const qty = Math.max(1, parseInt(quantity, 10) || 1);

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    const existingIndex = cart.items.findIndex((item) => item.cartItemId === cartItemId);

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += qty;
    } else {
      cart.items.push({
        cartItemId,
        product: product._id,
        selectedSize: size,
        selectedColor: color,
        quantity: qty,
      });
    }

    await cart.save();

    const populatedCart = await Cart.findById(cart._id).populate({
      path: 'items.product',
      populate: { path: 'category', select: 'name slug' },
    });

    res.status(200).json({
      status: true,
      message: 'Item added to cart',
      data: formatCartResponse(populatedCart),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update cart item quantity
 * @route   PUT /api/cart/update
 * @access  Private
 */
export const updateCartQuantity = async (req, res, next) => {
  try {
    const { cartItemId, quantity } = req.body;

    if (!cartItemId) {
      return res.status(400).json({ status: false, message: 'Cart item ID is required' });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ status: false, message: 'Cart not found' });
    }

    const newQty = parseInt(quantity, 10);

    if (newQty <= 0) {
      cart.items = cart.items.filter((item) => item.cartItemId !== cartItemId);
    } else {
      const item = cart.items.find((item) => item.cartItemId === cartItemId);
      if (item) {
        item.quantity = newQty;
      }
    }

    await cart.save();

    const populatedCart = await Cart.findById(cart._id).populate({
      path: 'items.product',
      populate: { path: 'category', select: 'name slug' },
    });

    res.status(200).json({
      status: true,
      message: 'Cart quantity updated',
      data: formatCartResponse(populatedCart),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove an item from cart
 * @route   DELETE /api/cart/item/:cartItemId
 * @access  Private
 */
export const removeCartItem = async (req, res, next) => {
  try {
    const { cartItemId } = req.params;

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ status: false, message: 'Cart not found' });
    }

    cart.items = cart.items.filter((item) => item.cartItemId !== cartItemId);
    await cart.save();

    const populatedCart = await Cart.findById(cart._id).populate({
      path: 'items.product',
      populate: { path: 'category', select: 'name slug' },
    });

    res.status(200).json({
      status: true,
      message: 'Item removed from cart',
      data: formatCartResponse(populatedCart),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Clear entire cart
 * @route   DELETE /api/cart/clear
 * @access  Private
 */
export const clearCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    res.status(200).json({
      status: true,
      message: 'Cart cleared successfully',
      data: { items: [], totalItems: 0, subtotal: 0 },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Merge guest cart into user account cart upon login
 * @route   POST /api/cart/merge
 * @access  Private
 */
export const mergeCart = async (req, res, next) => {
  try {
    const { guestItems = [] } = req.body;

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    for (const gItem of guestItems) {
      const prodId = gItem.product?.id || gItem.product?._id || gItem.productId;
      if (!prodId) continue;

      const product = await Product.findById(prodId);
      if (!product || product.isDeleted) continue;

      const size = gItem.selectedSize || 'Standard';
      const color =
        typeof gItem.selectedColor === 'string'
          ? { name: gItem.selectedColor, hex: '#1D241C' }
          : gItem.selectedColor || { name: 'Standard', hex: '#1D241C' };

      const cartItemId = gItem.id || `${product._id}-${size}-${color.name || 'Standard'}`;
      const qty = Math.max(1, parseInt(gItem.quantity, 10) || 1);

      const existingIndex = cart.items.findIndex((item) => item.cartItemId === cartItemId);
      if (existingIndex > -1) {
        cart.items[existingIndex].quantity += qty;
      } else {
        cart.items.push({
          cartItemId,
          product: product._id,
          selectedSize: size,
          selectedColor: color,
          quantity: qty,
        });
      }
    }

    await cart.save();

    const populatedCart = await Cart.findById(cart._id).populate({
      path: 'items.product',
      populate: { path: 'category', select: 'name slug' },
    });

    res.status(200).json({
      status: true,
      message: 'Cart merged successfully',
      data: formatCartResponse(populatedCart),
    });
  } catch (error) {
    next(error);
  }
};
