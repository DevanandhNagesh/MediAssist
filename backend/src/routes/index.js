import { Router } from 'express';
import diagnosisRoutes from './diagnosisRoutes.js';
import prescriptionRoutes from './prescriptionRoutes.js';
import knowledgeRoutes from './knowledgeRoutes.js';
import authRoutes from './authRoutes.js';
import medicineLogRoutes from './medicineLogRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Existing routes (UNTOUCHED - working features preserved)
router.use('/diagnosis', diagnosisRoutes);
router.use('/prescriptions', prescriptionRoutes);
router.use('/knowledge', knowledgeRoutes);

// New routes for authentication and medicine logging
router.use('/auth', authRoutes);
router.use('/medicine-logs', medicineLogRoutes);

export default router;
