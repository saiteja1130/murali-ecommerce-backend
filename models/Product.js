import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema(
  {
    sku: { type: String, trim: true },
    color: { type: String, trim: true, default: '' },
    colorHex: { type: String, trim: true, default: '#1A1A1A' },
    size: { type: String, trim: true, default: '' },
    stock: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a product name'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Please provide a product slug'],
      trim: true,
      unique: true,
    },
    sku: {
      type: String,
      required: [true, 'Please provide a master SKU'],
      trim: true,
      uppercase: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Please select a category'],
    },
    mainCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MainCategory',
      index: true,
    },
    price: {
      type: Number,
      required: [true, 'Please provide a retail price'],
      min: [0, 'Price must be positive'],
    },
    originalPrice: {
      type: Number,
      min: [0, 'Original price must be positive'],
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    images: {
      type: [String],
      default: [],
    },
    isStockAvailable: {
      type: Boolean,
      default: true,
    },
    variants: {
      type: [variantSchema],
      default: [],
    },
    composition: {
      type: String,
      trim: true,
      default: '',
    },
    sustainability: {
      type: String,
      trim: true,
      default: '',
    },
    careInstructions: {
      type: String,
      trim: true,
      default: '',
    },
    dimensions: {
      type: String,
      trim: true,
      default: '',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast searching and filtering
productSchema.index({ name: 'text', description: 'text', sku: 'text' });
productSchema.index({ category: 1, isStockAvailable: 1, isDeleted: 1 });

const Product = mongoose.model('Product', productSchema);
export default Product;
