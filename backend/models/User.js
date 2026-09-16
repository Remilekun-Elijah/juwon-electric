import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String },
    role: {
      type: String,
      enum: ['superadmin','admin','inventory','sales','engineer','hr','customer','support'],
      default: 'customer',
      index: true,
    },
    phone: { type: String },
    address: { type: String },
    profile: {
      avatarUrl: String,
      certifications: [String],
      bio: String,
    },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 });

export default mongoose.models.User || mongoose.model('User', UserSchema);
