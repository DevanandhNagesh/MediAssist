import mongoose from 'mongoose';

const { Schema } = mongoose;

const diseaseSchema = new Schema({
  name: { type: String, required: true, unique: true, index: true },
  description: { type: String },
  symptoms: [{ type: String, index: true }],
  probableSymptoms: [{ type: String }],
  severityLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
  contagious: { type: Boolean, default: false },
  riskFactors: [{ type: String }],
  recommendedActions: [{ type: String }],
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Disease', diseaseSchema);
