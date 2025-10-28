import { analyzePrescriptionImage } from '../services/prescriptionService.js';
import logger from '../config/logger.js';

export const analyzePrescription = async(req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        medicines: [],
        message: 'No prescription image uploaded'
      });
    }

    const result = await analyzePrescriptionImage(req.file.path);
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error('Prescription analysis failed', { error: error.message });
    next(error);
  }
};

export default {
  analyzePrescription
};
