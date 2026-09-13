import Category from '../models/Category.js';
import MainCategory from '../models/MainCategory.js';
import Product from '../models/Product.js';
import fs from 'fs';
import path from 'path';
import { toFullImageUrl, toLocalFilePath } from '../utils/urlHelper.js';

export const getCategories = async (req, res, next) => {
  try {
    const { mainCategory } = req.query;
    const filter = {};

    if (mainCategory) {
      if (mainCategory.match(/^[0-9a-fA-F]{24}$/)) {
        filter.mainCategory = mainCategory;
      } else {
        const foundMain = await MainCategory.findOne({ slug: mainCategory.toLowerCase() });
        if (foundMain) {
          filter.mainCategory = foundMain._id;
        } else {
          return res.status(200).json({ success: true, count: 0, data: [] });
        }
      }
    }

    const categories = await Category.find(filter)
      .populate('mainCategory', 'name slug image')
      .sort({ order: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const { name, slug, mainCategory, description, isFeatured, order } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a category name' });
    }

    if (!mainCategory) {
      return res.status(400).json({ success: false, message: 'Please select a parent main category' });
    }

    // Verify mainCategory exists
    let mainCatId = mainCategory;
    if (!mainCategory.match(/^[0-9a-fA-F]{24}$/)) {
      const foundMain = await MainCategory.findOne({ slug: mainCategory.toLowerCase() });
      if (!foundMain) {
        return res.status(400).json({ success: false, message: 'Invalid main category specified' });
      }
      mainCatId = foundMain._id;
    } else {
      const exists = await MainCategory.findById(mainCategory);
      if (!exists) {
        return res.status(400).json({ success: false, message: 'Main category not found' });
      }
    }

    let imageUrl = '';
    if (req.file) {
      imageUrl = toFullImageUrl(req, req.file.filename, 'categories');
    } else if (req.body.image) {
      imageUrl = toFullImageUrl(req, typeof req.body.image === 'string' ? req.body.image : '', 'categories');
    }

    const generatedSlug = (slug || name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');

    const category = await Category.create({
      name: name.trim(),
      slug: generatedSlug,
      mainCategory: mainCatId,
      description: description || '',
      image: imageUrl,
      isFeatured: isFeatured === 'true' || isFeatured === true,
      order: order ? Number(order) : 0,
    });

    const populated = await Category.findById(category._id).populate('mainCategory', 'name slug image');

    res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    let category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const { name, slug, mainCategory, description, isFeatured, order } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (slug !== undefined) updateData.slug = slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    if (description !== undefined) updateData.description = description;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured === 'true' || isFeatured === true;
    if (order !== undefined) updateData.order = Number(order);

    if (mainCategory) {
      if (mainCategory.match(/^[0-9a-fA-F]{24}$/)) {
        updateData.mainCategory = mainCategory;
      } else {
        const foundMain = await MainCategory.findOne({ slug: mainCategory.toLowerCase() });
        if (foundMain) {
          updateData.mainCategory = foundMain._id;
        }
      }
    }

    if (req.file) {
      updateData.image = toFullImageUrl(req, req.file.filename, 'categories');

      if (category.image) {
        const oldImagePath = toLocalFilePath(category.image, 'categories');
        if (oldImagePath && fs.existsSync(oldImagePath)) {
          try { fs.unlinkSync(oldImagePath); } catch (e) {}
        }
      }
    } else if (req.body.image !== undefined && req.body.image !== category.image) {
      updateData.image = toFullImageUrl(req, req.body.image, 'categories');
    }

    category = await Category.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate('mainCategory', 'name slug image');

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Check if any products are associated with this category
    const associatedProductsCount = await Product.countDocuments({ category: category._id });
    if (associatedProductsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. There are ${associatedProductsCount} products using this category. Please reassign or delete them first.`,
      });
    }

    if (category.image) {
      const imagePath = toLocalFilePath(category.image, 'categories');
      if (imagePath && fs.existsSync(imagePath)) {
        try { fs.unlinkSync(imagePath); } catch (e) {}
      }
    }

    await Category.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {},
      message: 'Category deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
