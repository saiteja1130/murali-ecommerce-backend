import mongoose from 'mongoose';

const checkoutSessionItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    selectedSize: {
      type: String,
      default: 'Standard',
      trim: true,
    },
    selectedColor: {
      name: { type: String, default: 'Standard' },
      hex: { type: String, default: '#1D241C' },
    },
    image: {
      type: String,
      default: '',
    },
    sku: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const checkoutSessionAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    apartment: { type: String, default: '', trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, default: 'India', trim: true },
    addressType: { type: String, default: 'home' },
  },
  { _id: false }
);

const checkoutSessionSchema = new mongoose.Schema(
  {
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    orderNumber: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: [checkoutSessionItemSchema],
    shippingAddress: checkoutSessionAddressSchema,
    paymentMethod: {
      type: String,
      default: 'upi',
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingCost: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    promoCode: {
      type: String,
      default: '',
      trim: true,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    notes: {
      type: String,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      // Automatically expire and delete abandoned checkout sessions after 24 hours
      expires: 86400,
    },
  },
  { timestamps: true }
);

const CheckoutSession = mongoose.model('CheckoutSession', checkoutSessionSchema);

export default CheckoutSession;
