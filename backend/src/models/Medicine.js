import mongoose from 'mongoose';

const { Schema } = mongoose;

const dosageSchema = new Schema({
  ageGroup: String,
  dosage: String,
  frequency: String,
  duration: String
}, { _id: false });

const medicineSchema = new Schema({
  name: { type: String, required: true, unique: true, index: true },
  genericName: { type: String },
  brandNames: [{ type: String }],
  pillImprint: { type: String },
  color: { type: String },
  shape: { type: String },
  uses: [{ type: String }],
  dosageGuidelines: [dosageSchema],
  sideEffects: [{ type: String }],
  warnings: [{ type: String }],
  interactions: [{ type: String }],
  storageInfo: { type: String },
  overTheCounter: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

medicineSchema.index({ pillImprint: 1, color: 1, shape: 1 });

export default mongoose.model('Medicine', medicineSchema);
