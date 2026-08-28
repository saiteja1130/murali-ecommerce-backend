import Category from '../models/Category.js';
import Product from '../models/Product.js';
import fs from 'fs';
import path from 'path';

export const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({}).sort({ order: 1 });
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
    const { name, slug, description, isFeatured, order } = req.body;

    let imageUrl = '';
    if (req.file) {
      imageUrl = `${req.protocol}://${req.get('host')}/uploads/categories/${req.file.filename}`;
    } else {
      imageUrl = typeof req.body.image === 'string' ? req.body.image : '';
    }

    console.log('--- DEBUG CREATE CATEGORY ---');
    console.log('req.body:', req.body);
    console.log('req.file:', req.file);
    console.log('imageUrl:', imageUrl);
    console.log('typeof imageUrl:', typeof imageUrl);

    const category = await Category.create({
      name,
      slug: slug || name.toLowerCase().replace(/ /g, '-'),
      description,
      image: imageUrl,
      isFeatured: isFeatured === 'true' || isFeatured === true,
      order: order ? Number(order) : 0,
    });

    res.status(201).json({
      success: true,
      data: category,
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

    const { name, slug, description, isFeatured, order } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured === 'true' || isFeatured === true;
    if (order !== undefined) updateData.order = Number(order);

    if (req.file) {
      updateData.image = `${req.protocol}://${req.get('host')}/uploads/categories/${req.file.filename}`;

      if (category.image && category.image.includes('/uploads/')) {
        const oldImagePath = path.join(process.cwd(), category.image.split(req.get('host'))[1] || '');
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    } else if (req.body.image !== undefined && req.body.image !== category.image) {
      updateData.image = req.body.image;
    }

    category = await Category.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

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
        message: `Cannot delete category. There are ${associatedProductsCount} products using this category. Please reassign or delete them first.`
      });
    }

    if (category.image && category.image.includes('/uploads/')) {
      try {
        const urlObj = new URL(category.image);
        const imagePath = path.join(process.cwd(), urlObj.pathname);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (e) {
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
