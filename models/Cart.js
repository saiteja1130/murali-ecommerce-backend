import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    cartItemId: {
      type: String,
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
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
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    items: [cartItemSchema],
  },
  {
    timestamps: true,
  }
);

const Cart = mongoose.model('Cart', cartSchema);
export default Cart;
