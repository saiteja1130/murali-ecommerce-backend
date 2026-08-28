import mongoose from 'mongoose';

const heroSlideSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title for the slide'],
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      required: [true, 'Please provide an image URL'],
    },
    ctaText: {
      type: String,
      trim: true,
      default: 'Explore',
    },
    ctaLink: {
      type: String,
      trim: true,
      default: '/',
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

const HeroSlide = mongoose.model('HeroSlide', heroSlideSchema);
export default HeroSlide;
