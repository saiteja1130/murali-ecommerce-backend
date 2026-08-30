import Product from '../models/Product.js';
import Category from '../models/Category.js';
import MainCategory from '../models/MainCategory.js';
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

    const {
      search,
      mainCategory,
      category,
      categories,
      minPrice,
      maxPrice,
      color,
      colors,
      size,
      sizes,
      stockStatus,
      inStockOnly,
      sort,
      includeArchived,
    } = req.query;

    const query = {};

    // Soft delete filter
    if (includeArchived !== 'true') {
      query.isDeleted = { $ne: true };
    }

    // Main Category filter
    if (mainCategory && mainCategory !== 'all' && mainCategory !== 'All') {
      if (mainCategory.match(/^[0-9a-fA-F]{24}$/)) {
        query.mainCategory = mainCategory;
      } else {
        const foundMain = await MainCategory.findOne({ slug: mainCategory.toLowerCase() });
        if (foundMain) {
          query.mainCategory = foundMain._id;
        }
      }
    }

    // Search filter across name, SKU, description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Category filter (supports ID, single slug, comma-separated list, or array)
    const targetCategory = category || categories;
    if (targetCategory && targetCategory !== 'all' && targetCategory !== 'All') {
      const catList = Array.isArray(targetCategory)
        ? targetCategory
        : targetCategory.split(',').map((c) => c.trim()).filter(Boolean);

      const objectIds = [];
      const slugs = [];

      for (const item of catList) {
        if (item.match(/^[0-9a-fA-F]{24}$/)) {
          objectIds.push(item);
        } else {
          slugs.push(item);
        }
      }

      if (slugs.length > 0) {
        const matchedCategories = await Category.find({
          $or: [
            { slug: { $in: slugs.map((s) => new RegExp(`^${s}$`, 'i')) } },
            { name: { $in: slugs.map((s) => new RegExp(`^${s}$`, 'i')) } },
          ],
        });
        matchedCategories.forEach((cat) => objectIds.push(cat._id));
      }

      if (objectIds.length > 0) {
        query.category = { $in: objectIds };
      }
    }

    // Price range filtering (minPrice & maxPrice)
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined && minPrice !== '') {
        query.price.$gte = Number(minPrice);
      }
      if (maxPrice !== undefined && maxPrice !== '') {
        query.price.$lte = Number(maxPrice);
      }
    }

    // Color variant filtering (checks variants.color or variants.colorHex)
    const targetColors = color || colors;
    if (targetColors && targetColors !== 'all') {
      const colorList = Array.isArray(targetColors)
        ? targetColors
        : targetColors.split(',').map((c) => c.trim()).filter(Boolean);

      if (colorList.length > 0) {
        query['variants.color'] = {
          $in: colorList.map((c) => new RegExp(`^${c}$`, 'i')),
        };
      }
    }

    // Size variant filtering (checks variants.size)
    const targetSizes = size || sizes;
    if (targetSizes && targetSizes !== 'all') {
      const sizeList = Array.isArray(targetSizes)
        ? targetSizes
        : targetSizes.split(',').map((s) => s.trim()).filter(Boolean);

      if (sizeList.length > 0) {
        query['variants.size'] = {
          $in: sizeList.map((s) => new RegExp(`^${s}$`, 'i')),
        };
      }
    }

    // Stock availability filter
    if (inStockOnly === 'true' || stockStatus === 'in_stock') {
      query.isStockAvailable = true;
    } else if (stockStatus === 'out_of_stock') {
      query.isStockAvailable = false;
    }

    // Sort order mapping
    let sortObj = { createdAt: -1 };
    if (sort === 'price_asc') sortObj = { price: 1 };
    else if (sort === 'price_desc') sortObj = { price: -1 };
    else if (sort === 'name_asc') sortObj = { name: 1 };
    else if (sort === 'name_desc') sortObj = { name: -1 };
    else if (sort === 'oldest') sortObj = { createdAt: 1 };
    else if (sort === 'newest') sortObj = { createdAt: -1 };

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name slug image description mainCategory')
      .populate('mainCategory', 'name slug image')
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

export const getProductFacets = async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ order: 1 });
    const products = await Product.find({ isDeleted: { $ne: true } }).select('category price variants isStockAvailable');

    let minPrice = 0;
    let maxPrice = 1000;
    const colorsMap = new Map();
    const sizesSet = new Set();
    const categoryCountMap = {};

    categories.forEach((cat) => {
      categoryCountMap[cat._id.toString()] = 0;
    });

    if (products.length > 0) {
      minPrice = Math.min(...products.map((p) => p.price || 0));
      maxPrice = Math.max(...products.map((p) => p.price || 0));

      products.forEach((prod) => {
        const catId = prod.category?.toString();
        if (catId && categoryCountMap[catId] !== undefined) {
          categoryCountMap[catId]++;
        }

        if (Array.isArray(prod.variants)) {
          prod.variants.forEach((v) => {
            if (v.color) {
              const name = v.color.trim();
              const hex = v.colorHex || '#1A1A1A';
              if (!colorsMap.has(name.toLowerCase())) {
                colorsMap.set(name.toLowerCase(), { name, hex });
              }
            }
            if (v.size) {
              sizesSet.add(v.size.trim());
            }
          });
        }
      });
    }

    const categoriesWithCount = categories.map((cat) => ({
      id: cat._id,
      name: cat.name,
      slug: cat.slug,
      image: cat.image,
      itemCount: categoryCountMap[cat._id.toString()] || 0,
    }));

    res.status(200).json({
      status: true,
      data: {
        totalProducts: products.length,
        priceRange: {
          min: Math.floor(minPrice),
          max: Math.ceil(maxPrice) || 1000,
        },
        colors: Array.from(colorsMap.values()),
        sizes: Array.from(sizesSet),
        categories: categoriesWithCount,
      },
    });
  } catch (error) {
    console.error('Error fetching product facets:', error);
    res.status(500).json({ status: false, message: 'Server Error: Failed to fetch facets' });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    let product;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(id)
        .populate('category', 'name slug mainCategory')
        .populate('mainCategory', 'name slug image');
    } else {
      product = await Product.findOne({ slug: id })
        .populate('category', 'name slug mainCategory')
        .populate('mainCategory', 'name slug image');
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

    // Derive mainCategory from category if not explicitly provided
    let derivedMainCat = req.body.mainCategory || null;
    if (!derivedMainCat && category) {
      const catDoc = await Category.findById(category);
      if (catDoc && catDoc.mainCategory) {
        derivedMainCat = catDoc.mainCategory;
      }
    }

    const product = await Product.create({
      name,
      slug: generatedSlug,
      sku: (sku || `SKU-${Date.now().toString().slice(-6)}`).toUpperCase(),
      category,
      mainCategory: derivedMainCat,
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

    const populatedProduct = await Product.findById(product._id)
      .populate('category', 'name slug mainCategory')
      .populate('mainCategory', 'name slug image');

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
    if (category !== undefined) {
      updateData.category = category;
      if (req.body.mainCategory === undefined) {
        const catDoc = await Category.findById(category);
        if (catDoc && catDoc.mainCategory) {
          updateData.mainCategory = catDoc.mainCategory;
        }
      }
    }
    if (req.body.mainCategory !== undefined) {
      updateData.mainCategory = req.body.mainCategory;
    }
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
    })
      .populate('category', 'name slug mainCategory')
      .populate('mainCategory', 'name slug image');

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
