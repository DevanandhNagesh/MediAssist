import { Router } from 'express';
import validateRequest from '../middlewares/validateRequest.js';
import { symptomAnalysisSchema } from '../validation/diagnosisValidation.js';
import { analyzeSymptoms, getSymptomMetadata } from '../controllers/diagnosisController.js';

const router = Router();

router.get('/metadata', getSymptomMetadata);
router.post('/', validateRequest(symptomAnalysisSchema), analyzeSymptoms);

export default router;
