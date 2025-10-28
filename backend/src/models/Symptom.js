import mongoose from 'mongoose';

const { Schema } = mongoose;

const symptomSchema = new Schema({
  name: { type: String, required: true, unique: true, index: true },
  category: { type: String },
  description: { type: String },
  relatedDiseases: [{ type: Schema.Types.ObjectId, ref: 'Disease' }],
  severityWeights: {
    mild: { type: Number, default: 1 },
    moderate: { type: Number, default: 2 },
    severe: { type: Number, default: 3 }
  }
}, { timestamps: true });

export default mongoose.model('Symptom', symptomSchema);
