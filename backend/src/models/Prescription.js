import mongoose from 'mongoose';

const { Schema } = mongoose;

const priceSchema = new Schema({
  value: { type: Number },
  currency: { type: String }
}, { _id: false });

const prescriptionItemSchema = new Schema({
  medicineName: { type: String, required: true },
  dosage: { type: String },
  frequency: { type: String },
  duration: { type: String },
  notes: { type: String },
  manufacturer: { type: String },
  type: { type: String },
  packSize: { type: String },
  sideEffects: [{ type: String }],
  uses: [{ type: String }],
  substitutes: [{ type: String }],
  compositions: [{ type: String }],
  matchedTerms: [{ type: String }],
  chemicalClass: { type: String },
  therapeuticClass: { type: String },
  actionClass: { type: String },
  habitForming: { type: Boolean },
  price: { type: priceSchema }
}, { _id: false });

const prescriptionSchema = new Schema({
  patientName: { type: String },
  physicianName: { type: String },
  items: [prescriptionItemSchema],
  rawText: { type: String },
  imagePath: { type: String },
  extractedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Prescription', prescriptionSchema);
