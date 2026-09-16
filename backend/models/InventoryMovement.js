import mongoose from 'mongoose';

const InventoryMovementSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    change: { type: Number, required: true },
    reason: { type: String },
    referenceId: { type: String },
    source: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.models.InventoryMovement || mongoose.model('InventoryMovement', InventoryMovementSchema);
