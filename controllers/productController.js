import Product from '../models/Product.js';
import Category from '../models/Category.js';
import fs from 'fs';
import path from 'path';

// Helper to delete an image file from disk
const deleteProductImageFile = (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('/uploads/products/')) return;
  try {
    const urlObj = new URL(imageUrl);
    const relativePath = urlObj.pathname;
    const fullPath = path.join(process.cwd(), relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    try {
      const parts = imageUrl.split('/uploads/products/');
      if (parts[1]) {
        const fullPath = path.join(process.cwd(), 'uploads', 'products', parts[1]);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
    } catch (e) {
      console.error('Error cleaning up product image file:', e);
    }
  }
};

export const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const skip = (page - 1) * limit;

    const { search, category, stockStatus, sort, includeArchived } = req.query;

    const query = {};

    // Soft delete filter
    if (includeArchived !== 'true') {
      query.isDeleted = { $ne: true };
    }

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Category filter (support ID or Category slug/name lookup)
    if (category && category !== 'all' && category !== 'All') {
      if (category.match(/^[0-9a-fA-F]{24}$/)) {
        query.category = category;
      } else {
        const matchedCategory = await Category.findOne({
          $or: [
            { slug: { $regex: `^${category}$`, $options: 'i' } },
            { name: { $regex: `^${category}$`, $options: 'i' } },
          ],
        });
        if (matchedCategory) {
          query.category = matchedCategory._id;
        }
      }
    }

    // Stock availability filter
    if (stockStatus === 'in_stock') {
      query.isStockAvailable = true;
    } else if (stockStatus === 'out_of_stock') {
      query.isStockAvailable = false;
    }

    // Sort order
    let sortObj = { createdAt: -1 };
    if (sort === 'price_asc') sortObj = { price: 1 };
    else if (sort === 'price_desc') sortObj = { price: -1 };
    else if (sort === 'name_asc') sortObj = { name: 1 };
    else if (sort === 'name_desc') sortObj = { name: -1 };
    else if (sort === 'oldest') sortObj = { createdAt: 1 };

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      status: true,
      count: products.length,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      data: products,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ status: false, message: 'Server Error: Failed to fetch products' });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    let product;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(id).populate('category', 'name slug');
    } else {
      product = await Product.findOne({ slug: id }).populate('category', 'name slug');
    }

    if (!product || (product.isDeleted && req.query.includeArchived !== 'true')) {
      return res.status(404).json({ status: false, message: 'Product not found' });
    }

    res.status(200).json({
      status: true,
      data: product,
    });
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    res.status(500).json({ status: false, message: 'Server Error: Failed to fetch product' });
  }
};

export const createProduct = async (req, res) => {
  try {
    const {
      name,
      slug,
      sku,
      category,
      price,
      originalPrice,
      description,
      isStockAvailable,
      variants,
      composition,
      sustainability,
      careInstructions,
      dimensions,
    } = req.body;

    // Process uploaded image files from Multer
    let uploadedImages = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      uploadedImages = req.files.map(
        (file) => `${req.protocol}://${req.get('host')}/uploads/products/${file.filename}`
      );
    }

    // If image URLs were also passed in body (e.g. from existing image text or array)
    let finalImages = [...uploadedImages];
    if (req.body.images) {
      try {
        const extraImages = typeof req.body.images === 'string' ? JSON.parse(req.body.images) : req.body.images;
        if (Array.isArray(extraImages)) {
          finalImages = [...finalImages, ...extraImages];
        }
      } catch (e) {
        if (typeof req.body.images === 'string') {
          finalImages.push(req.body.images);
        }
      }
    }

    // Parse variants if passed as stringified JSON
    let parsedVariants = [];
    if (variants) {
      parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
    }

    const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const product = await Product.create({
      name,
      slug: generatedSlug,
      sku: (sku || `SKU-${Date.now().toString().slice(-6)}`).toUpperCase(),
      category,
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : null,
      description: description || '',
      images: finalImages,
      isStockAvailable: isStockAvailable === 'true' || isStockAvailable === true,
      variants: parsedVariants,
      composition: composition || '',
      sustainability: sustainability || '',
      careInstructions: careInstructions || '',
      dimensions: dimensions || '',
    });

    const populatedProduct = await Product.findById(product._id).populate('category', 'name slug');

    res.status(201).json({
      status: true,
      data: populatedProduct,
    });
  } catch (error) {
    console.error('Error creating product:', error);
    if (error.code === 11000) {
      return res.status(400).json({ status: false, message: 'A product with this Slug or SKU already exists' });
    }
    res.status(500).json({ status: false, message: error.message || 'Server Error: Failed to create product' });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ status: false, message: 'Product not found' });
    }

    const {
      name,
      slug,
      sku,
      category,
      price,
      originalPrice,
      description,
      isStockAvailable,
      variants,
      existingImages,
      composition,
      sustainability,
      careInstructions,
      dimensions,
    } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (sku !== undefined) updateData.sku = sku.toUpperCase();
    if (category !== undefined) updateData.category = category;
    if (price !== undefined) updateData.price = Number(price);
    if (originalPrice !== undefined) updateData.originalPrice = originalPrice ? Number(originalPrice) : null;
    if (description !== undefined) updateData.description = description;
    if (isStockAvailable !== undefined) {
      updateData.isStockAvailable = isStockAvailable === 'true' || isStockAvailable === true;
    }
    if (composition !== undefined) updateData.composition = composition;
    if (sustainability !== undefined) updateData.sustainability = sustainability;
    if (careInstructions !== undefined) updateData.careInstructions = careInstructions;
    if (dimensions !== undefined) updateData.dimensions = dimensions;

    if (variants !== undefined) {
      updateData.variants = typeof variants === 'string' ? JSON.parse(variants) : variants;
    }

    // Handle image updates: existing images kept + newly uploaded files
    let retainedImages = [];
    if (existingImages) {
      try {
        retainedImages = typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages;
      } catch (e) {
        retainedImages = Array.isArray(existingImages) ? existingImages : [existingImages];
      }
    } else if (req.body.images) {
      try {
        retainedImages = typeof req.body.images === 'string' ? JSON.parse(req.body.images) : req.body.images;
      } catch (e) {
        retainedImages = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
      }
    } else {
      retainedImages = product.images || [];
    }

    let newImages = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      newImages = req.files.map(
        (file) => `${req.protocol}://${req.get('host')}/uploads/products/${file.filename}`
      );
    }

    // If new files were uploaded or existing images list was modified, clean up removed images from disk
    const combinedImages = [...retainedImages, ...newImages];
    const removedImages = product.images.filter((oldImg) => !combinedImages.includes(oldImg));
    removedImages.forEach((img) => deleteProductImageFile(img));

    updateData.images = combinedImages;

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate('category', 'name slug');

    res.status(200).json({
      status: true,
      data: updatedProduct,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    if (error.code === 11000) {
      return res.status(400).json({ status: false, message: 'A product with this Slug or SKU already exists' });
    }
    res.status(500).json({ status: false, message: error.message || 'Server Error: Failed to update product' });
  }
};

export const toggleStockAvailability = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ status: false, message: 'Product not found' });
    }

    const nextState = req.body.isStockAvailable !== undefined 
      ? (req.body.isStockAvailable === 'true' || req.body.isStockAvailable === true)
      : !product.isStockAvailable;

    product.isStockAvailable = nextState;
    await product.save();

    res.status(200).json({
      status: true,
      data: product,
      message: `Stock availability set to ${nextState ? 'Enabled (In Stock)' : 'Disabled (Out of Stock)'}`,
    });
  } catch (error) {
    console.error('Error toggling stock availability:', error);
    res.status(500).json({ status: false, message: 'Server Error' });
  }
};

export const softDeleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ status: false, message: 'Product not found' });
    }

    product.isDeleted = true;
    product.isStockAvailable = false;
    product.deletedAt = new Date();
    await product.save();

    res.status(200).json({
      status: true,
      message: 'Product safely archived (Soft Deleted). Order history and analytics preserved.',
    });
  } catch (error) {
    console.error('Error soft-deleting product:', error);
    res.status(500).json({ status: false, message: 'Server Error' });
  }
};

export const restoreProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ status: false, message: 'Product not found' });
    }

    product.isDeleted = false;
    product.deletedAt = null;
    await product.save();

    res.status(200).json({
      status: true,
      data: product,
      message: 'Product successfully restored to active catalog.',
    });
  } catch (error) {
    console.error('Error restoring product:', error);
    res.status(500).json({ status: false, message: 'Server Error' });
  }
};
