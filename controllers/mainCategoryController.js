import MainCategory from '../models/MainCategory.js';
import Category from '../models/Category.js';

/**
 * @desc    Get all main categories
 * @route   GET /api/main-categories
 * @access  Public
 */
export const getMainCategories = async (req, res, next) => {
  try {
    const mainCategories = await MainCategory.find().sort({ order: 1, createdAt: 1 });

    // Attach subcategory counts
    const enriched = await Promise.all(
      mainCategories.map(async (mCat) => {
        const subcategoryCount = await Category.countDocuments({ mainCategory: mCat._id });
        return {
          id: mCat._id,
          _id: mCat._id,
          name: mCat.name,
          slug: mCat.slug,
          description: mCat.description,
          image: mCat.image,
          isActive: mCat.isActive,
          order: mCat.order,
          subcategoryCount,
          createdAt: mCat.createdAt,
          updatedAt: mCat.updatedAt,
        };
      })
    );

    res.status(200).json({
      status: true,
      count: enriched.length,
      data: enriched,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single main category by ID or slug
 * @route   GET /api/main-categories/:id
 * @access  Public
 */
export const getMainCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let mainCategory = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      mainCategory = await MainCategory.findById(id);
    } else {
      mainCategory = await MainCategory.findOne({ slug: id.toLowerCase() });
    }

    if (!mainCategory) {
      return res.status(404).json({
        status: false,
        message: 'Main category not found',
      });
    }

    const subcategories = await Category.find({ mainCategory: mainCategory._id }).sort({ order: 1 });

    res.status(200).json({
      status: true,
      data: {
        ...mainCategory.toObject(),
        id: mainCategory._id,
        subcategories,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a main category
 * @route   POST /api/main-categories
 * @access  Private/Admin
 */
export const createMainCategory = async (req, res, next) => {
  try {
    const { name, slug, description, order, isActive } = req.body;

    if (!name) {
      return res.status(400).json({
        status: false,
        message: 'Please provide a main category name',
      });
    }

    const generatedSlug = (slug || name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');

    const existing = await MainCategory.findOne({
      $or: [{ name: name.trim() }, { slug: generatedSlug }],
    });

    if (existing) {
      return res.status(400).json({
        status: false,
        message: 'A main category with this name or slug already exists',
      });
    }

    let imagePath = '';
    if (req.file) {
      imagePath = `/uploads/main-categories/${req.file.filename}`;
    } else if (req.body.image) {
      imagePath = req.body.image;
    }

    const mainCategory = await MainCategory.create({
      name: name.trim(),
      slug: generatedSlug,
      description: description || '',
      image: imagePath,
      order: order !== undefined ? Number(order) : 0,
      isActive: isActive !== undefined ? isActive === 'true' || isActive === true : true,
    });

    res.status(201).json({
      status: true,
      message: 'Main category created successfully',
      data: {
        ...mainCategory.toObject(),
        id: mainCategory._id,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a main category
 * @route   PUT /api/main-categories/:id
 * @access  Private/Admin
 */
export const updateMainCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, slug, description, order, isActive } = req.body;

    const mainCategory = await MainCategory.findById(id);
    if (!mainCategory) {
      return res.status(404).json({
        status: false,
        message: 'Main category not found',
      });
    }

    if (name) mainCategory.name = name.trim();
    if (slug) mainCategory.slug = slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    if (description !== undefined) mainCategory.description = description;
    if (order !== undefined) mainCategory.order = Number(order);
    if (isActive !== undefined) mainCategory.isActive = isActive === 'true' || isActive === true;

    if (req.file) {
      mainCategory.image = `/uploads/main-categories/${req.file.filename}`;
    } else if (req.body.image) {
      mainCategory.image = req.body.image;
    }

    await mainCategory.save();

    res.status(200).json({
      status: true,
      message: 'Main category updated successfully',
      data: {
        ...mainCategory.toObject(),
        id: mainCategory._id,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a main category
 * @route   DELETE /api/main-categories/:id
 * @access  Private/Admin
 */
export const deleteMainCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const mainCategory = await MainCategory.findById(id);
    if (!mainCategory) {
      return res.status(404).json({
        status: false,
        message: 'Main category not found',
      });
    }

    // Check if subcategories are attached
    const subcategoryCount = await Category.countDocuments({ mainCategory: mainCategory._id });
    if (subcategoryCount > 0) {
      return res.status(400).json({
        status: false,
        message: `Cannot delete "${mainCategory.name}" because it contains ${subcategoryCount} subcategory(s). Reassign or delete subcategories first.`,
      });
    }

    await MainCategory.findByIdAndDelete(id);

    res.status(200).json({
      status: true,
      message: 'Main category deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
