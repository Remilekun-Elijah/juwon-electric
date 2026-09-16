import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema(
  {
    sku: { type: String, unique: true, index: true },
    name: { type: String, required: true, index: true },
    slug: { type: String, index: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    brand: { type: String },
    descriptionHtml: { type: String },
    attributes: { type: Map, of: String },
    price: { type: Number },
    costPrice: { type: Number },
    currency: { type: String, default: 'NGN' },
    stockQuantity: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 0 },
    images: [{ type: String }],
    status: { type: String, enum: ['active', 'hidden', 'archived'], default: 'active', index: true },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

ProductSchema.index({ sku: 1 });
ProductSchema.index({ slug: 1 });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
