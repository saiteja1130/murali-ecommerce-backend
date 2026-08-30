import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    shippingFee: {
      type: Number,
      required: true,
      default: 30,
      min: 0,
    },
    freeShippingThreshold: {
      type: Number,
      required: true,
      default: 5000,
      min: 0,
    },
    promoCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'SUMI15',
    },
    discountPercent: {
      type: Number,
      default: 15,
      min: 0,
      max: 100,
    },
    isPromoActive: {
      type: Boolean,
      default: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    storeName: {
      type: String,
      default: 'SUMILUX Haute Couture',
    },
  },
  {
    timestamps: true,
  }
);

// Singleton pattern helper to get or create settings
settingsSchema.statics.getSingleton = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      shippingFee: 30,
      freeShippingThreshold: 5000,
      promoCode: 'SUMI15',
      discountPercent: 15,
      isPromoActive: true,
    });
  }
  return settings;
};

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
