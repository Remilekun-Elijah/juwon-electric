import mongoose from 'mongoose';

const VacancySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    department: { type: String },
    location: { type: String },
    employmentType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship', 'temporary'],
    },
    salaryRange: { type: String },
    descriptionHtml: { type: String },
    requirements: [{ type: String }],
    responsibilities: [{ type: String }],
    status: { type: String, enum: ['draft', 'open', 'closed'], default: 'draft', index: true },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    postedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

VacancySchema.index({ slug: 1 });

export default mongoose.models.Vacancy || mongoose.model('Vacancy', VacancySchema);
