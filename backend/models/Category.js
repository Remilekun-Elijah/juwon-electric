import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    slug: { type: String, unique: true, index: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    description: { type: String },
    imageUrl: { type: String },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

CategorySchema.index({ slug: 1 });

export default mongoose.models.Category || mongoose.model('Category', CategorySchema);
