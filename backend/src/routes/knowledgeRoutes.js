import { Router } from 'express';
import validateRequest from '../middlewares/validateRequest.js';
import { knowledgeSearchSchema } from '../validation/knowledgeValidation.js';
import { simplifyKnowledge, lookupMedicine } from '../controllers/knowledgeController.js';

const router = Router();

router.post('/search', validateRequest(knowledgeSearchSchema), simplifyKnowledge);
router.get('/medicine/:name', lookupMedicine);

export default router;
