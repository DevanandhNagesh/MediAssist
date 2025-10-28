import mongoose from 'mongoose';

const { Schema } = mongoose;

const userQuerySchema = new Schema({
  queryText: { type: String, required: true },
  queryType: { type: String, enum: ['symptom', 'knowledge', 'medicine', 'pill'], required: true },
  response: { type: Schema.Types.Mixed },
  requestId: { type: String },
  metadata: { type: Schema.Types.Mixed },
  queriedAt: { type: Date, default: Date.now }
}, { timestamps: true });

userQuerySchema.index({ queryText: 'text' });

export default mongoose.model('UserQuery', userQuerySchema);
