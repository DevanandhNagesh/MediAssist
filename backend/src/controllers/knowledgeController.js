import asyncHandler from '../utils/asyncHandler.js';
import { searchKnowledge, getMedicineDetails } from '../services/knowledgeService.js';

export const simplifyKnowledge = asyncHandler(async(req, res) => {
  const { query } = req.body;
  const response = await searchKnowledge({ query });
  res.json({ requestId: req.requestId, ...response });
});

export const lookupMedicine = asyncHandler(async(req, res) => {
  const { name } = req.params;
  const medicine = await getMedicineDetails(name);

  if (!medicine) {
    res.status(404).json({ requestId: req.requestId, message: 'Medicine not found' });
    return;
  }

  res.json({ requestId: req.requestId, medicine });
});
