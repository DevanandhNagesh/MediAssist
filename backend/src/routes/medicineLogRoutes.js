import express from 'express';
import {
  createMedicineLog,
  getMedicineLogs,
  getMedicineLog,
  logDose,
  logMissedDose,
  updateMedicineLog,
  deleteMedicineLog,
  getAdherenceStats
} from '../controllers/medicineLogController.js';
import { authenticate } from '../middlewares/auth.js';
import { body } from 'express-validator';
import validateRequest from '../middlewares/validateRequest.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const createMedicineValidation = [
  body('medicineName').trim().notEmpty().withMessage('Medicine name is required'),
  body('expiryDate').isISO8601().withMessage('Please provide a valid expiry date'),
  body('stockQuantity.current').isInt({ min: 0 }).withMessage('Current stock must be a positive number'),
  body('dosageSchedule.frequency').optional().isIn(['once-daily', 'twice-daily', 'thrice-daily', 'as-needed', 'custom'])
];

const logDoseValidation = [
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1')
];

// Routes
router.post('/', createMedicineValidation, validateRequest(), createMedicineLog);
router.get('/', getMedicineLogs);
router.get('/stats', getAdherenceStats);
router.get('/:id', getMedicineLog);
router.post('/:id/dose', logDoseValidation, validateRequest(), logDose);
router.post('/:id/missed', logMissedDose);
router.put('/:id', updateMedicineLog);
router.delete('/:id', deleteMedicineLog);

export default router;
