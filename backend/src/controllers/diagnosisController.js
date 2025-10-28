import asyncHandler from '../utils/asyncHandler.js';
import { analyzeSymptoms as analyzeSymptomsService, getSymptomMetadata as getSymptomMetadataService } from '../services/symptomService.js';

export const analyzeSymptoms = asyncHandler(async(req, res) => {
  const { symptoms, age, gender, duration } = req.body;
  const result = await analyzeSymptomsService({ symptoms, age, gender, duration });
  res.json({ requestId: req.requestId, ...result });
});

export const getSymptomMetadata = asyncHandler(async(req, res) => {
  const metadata = await getSymptomMetadataService();
  res.json({ requestId: req.requestId, ...metadata });
});
