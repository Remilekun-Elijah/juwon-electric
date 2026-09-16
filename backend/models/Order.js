import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  sku: String,
  unitPrice: Number,
  qty: Number,
  totalPrice: Number,
  attributes: { type: Map, of: String },
});

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, index: true },
    customer: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: String,
      email: String,
      phone: String,
    },
    items: [OrderItemSchema],
    subtotal: Number,
    tax: Number,
    shipping: Number,
    total: Number,
    paymentStatus: { type: String, enum: ['pending','paid','failed','refunded'], default: 'pending' },
    fulfillmentStatus: { type: String, enum: ['pending','processing','out_for_delivery','delivered','installed','cancelled'], default: 'pending' },
    requiresInstallation: { type: Boolean, default: false },
    assignedEngineer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    shippingAddress: { type: Object },
    notes: String,
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
