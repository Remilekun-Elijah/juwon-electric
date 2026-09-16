import mongoose from 'mongoose';

const InstallationJobSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    engineer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    scheduledAt: { type: Date },
    durationEstimate: { type: Number },
    status: { type: String, enum: ['assigned','in_progress','completed','cancelled'], default: 'assigned' },
    checklist: [{ type: String }],
    photos: [{ type: String }],
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.InstallationJob || mongoose.model('InstallationJob', InstallationJobSchema);
