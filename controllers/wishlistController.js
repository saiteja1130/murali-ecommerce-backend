import User from '../models/User.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

// @desc    Get current user's wishlist
// @route   GET /api/wishlist
// @access  Private
export const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'wishlist',
      match: { isDeleted: false },
      populate: [
        { path: 'mainCategory', select: 'name slug' },
        { path: 'category', select: 'name slug' },
      ],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const validProducts = (user.wishlist || []).filter((item) => item !== null);

    res.status(200).json({
      success: true,
      count: validProducts.length,
      wishlistIds: validProducts.map((p) => p._id.toString()),
      data: validProducts,
    });
  } catch (error) {
    console.error('getWishlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch wishlist', error: error.message });
  }
};

// @desc    Toggle product in wishlist (Add if not exists, Remove if exists)
// @route   POST /api/wishlist/toggle
// @access  Private
export const toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Valid productId is required' });
    }

    // Verify product exists
    const product = await Product.findOne({ _id: productId, isDeleted: false });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.wishlist) {
      user.wishlist = [];
    }

    const isAlreadyWishlisted = user.wishlist.some(
      (id) => id.toString() === productId.toString()
    );

    if (isAlreadyWishlisted) {
      // Remove from wishlist
      user.wishlist = user.wishlist.filter(
        (id) => id.toString() !== productId.toString()
      );
    } else {
      // Add to wishlist
      user.wishlist.push(productId);
    }

    await user.save();

    res.status(200).json({
      success: true,
      action: isAlreadyWishlisted ? 'removed' : 'added',
      isWishlisted: !isAlreadyWishlisted,
      wishlistIds: user.wishlist.map((id) => id.toString()),
      message: isAlreadyWishlisted ? 'Removed from wishlist' : 'Added to wishlist',
    });
  } catch (error) {
    console.error('toggleWishlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to update wishlist', error: error.message });
  }
};

// @desc    Sync guest wishlist on login
// @route   POST /api/wishlist/sync
// @access  Private
export const syncWishlist = async (req, res) => {
  try {
    const { guestWishlist = [] } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.wishlist) {
      user.wishlist = [];
    }

    const existingIds = new Set(user.wishlist.map((id) => id.toString()));

    for (const prodId of guestWishlist) {
      if (prodId && mongoose.Types.ObjectId.isValid(prodId)) {
        existingIds.add(prodId.toString());
      }
    }

    user.wishlist = Array.from(existingIds);
    await user.save();

    const populatedUser = await User.findById(req.user._id).populate({
      path: 'wishlist',
      match: { isDeleted: false },
      populate: [
        { path: 'mainCategory', select: 'name slug' },
        { path: 'category', select: 'name slug' },
      ],
    });

    const validProducts = (populatedUser.wishlist || []).filter((item) => item !== null);

    res.status(200).json({
      success: true,
      count: validProducts.length,
      wishlistIds: validProducts.map((p) => p._id.toString()),
      data: validProducts,
      message: 'Wishlist synced successfully',
    });
  } catch (error) {
    console.error('syncWishlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to sync wishlist', error: error.message });
  }
};

// @desc    Remove product from wishlist
// @route   DELETE /api/wishlist/:productId
// @access  Private
export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.wishlist = (user.wishlist || []).filter(
      (id) => id.toString() !== productId.toString()
    );
    await user.save();

    res.status(200).json({
      success: true,
      wishlistIds: user.wishlist.map((id) => id.toString()),
      message: 'Product removed from wishlist',
    });
  } catch (error) {
    console.error('removeFromWishlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove from wishlist', error: error.message });
  }
};

// @desc    Clear entire wishlist
// @route   DELETE /api/wishlist
// @access  Private
export const clearWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.wishlist = [];
    await user.save();

    res.status(200).json({
      success: true,
      wishlistIds: [],
      message: 'Wishlist cleared successfully',
    });
  } catch (error) {
    console.error('clearWishlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear wishlist', error: error.message });
  }
};
