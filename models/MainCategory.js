import mongoose from 'mongoose';

const mainCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a main category name'],
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: [true, 'Please provide a main category slug'],
      trim: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    image: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const MainCategory = mongoose.model('MainCategory', mainCategorySchema);
export default MainCategory;
