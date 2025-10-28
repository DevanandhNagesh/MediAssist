import MedicineLog from '../models/MedicineLog.js';
import logger from '../config/logger.js';
import asyncHandler from '../utils/asyncHandler.js';

// Create new medicine log
export const createMedicineLog = asyncHandler(async (req, res) => {
  const {
    medicineName,
    dosageSchedule,
    expiryDate,
    stockQuantity,
    notes
  } = req.body;

  const medicineLog = await MedicineLog.create({
    userId: req.userId,
    medicineName,
    dosageSchedule,
    expiryDate,
    stockQuantity: {
      ...stockQuantity,
      initial: stockQuantity.current
    },
    notes
  });

  logger.info('Medicine log created', { userId: req.userId, medicineId: medicineLog._id });

  res.status(201).json({
    success: true,
    message: 'Medicine added successfully',
    data: { medicine: medicineLog }
  });
});

// Get all medicine logs for user
export const getMedicineLogs = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const filter = { userId: req.userId };
  if (status) {
    filter.status = status;
  }

  const medicines = await MedicineLog.find(filter).sort({ createdAt: -1 });

  // Update predictions for each medicine
  for (const medicine of medicines) {
    if (medicine.status === 'active' || medicine.status === 'low-stock') {
      medicine.predictStockOut();
      await medicine.save();
    }
  }

  res.json({
    success: true,
    data: { medicines }
  });
});

// Get single medicine log
export const getMedicineLog = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const medicine = await MedicineLog.findOne({
    _id: id,
    userId: req.userId
  });

  if (!medicine) {
    return res.status(404).json({
      success: false,
      message: 'Medicine not found'
    });
  }

  res.json({
    success: true,
    data: { medicine }
  });
});

// Log a dose taken
export const logDose = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { takenAt, scheduledTime, quantity } = req.body;

  const medicine = await MedicineLog.findOne({
    _id: id,
    userId: req.userId
  });

  if (!medicine) {
    return res.status(404).json({
      success: false,
      message: 'Medicine not found'
    });
  }

  const takenDate = takenAt ? new Date(takenAt) : new Date();
  const dosageAmount = quantity || 1;

  // Check if dose was on time (within 30 minutes of scheduled time)
  let onTime = true;
  if (scheduledTime) {
    const scheduled = new Date(scheduledTime);
    const diffMinutes = Math.abs(takenDate - scheduled) / (1000 * 60);
    onTime = diffMinutes <= 30;
  }

  // Add to usage history
  medicine.usageHistory.push({
    takenAt: takenDate,
    scheduledTime,
    onTime,
    quantity: dosageAmount,
    createdAt: new Date()
  });

  // Update stock
  await medicine.updateStock(dosageAmount);

  // Recalculate predictions
  medicine.predictStockOut();
  await medicine.save();

  logger.info('Dose logged', {
    userId: req.userId,
    medicineId: medicine._id,
    quantity: dosageAmount
  });

  res.json({
    success: true,
    message: 'Dose logged successfully',
    data: { medicine }
  });
});

// Log missed dose
export const logMissedDose = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { scheduledTime } = req.body;

  const medicine = await MedicineLog.findOne({
    _id: id,
    userId: req.userId
  });

  if (!medicine) {
    return res.status(404).json({
      success: false,
      message: 'Medicine not found'
    });
  }

  medicine.missedDoses.push({
    scheduledTime: new Date(scheduledTime),
    detectedAt: new Date(),
    createdAt: new Date()
  });

  await medicine.save();

  logger.info('Missed dose logged', {
    userId: req.userId,
    medicineId: medicine._id
  });

  res.json({
    success: true,
    message: 'Missed dose logged',
    data: { medicine }
  });
});

// Update medicine log
export const updateMedicineLog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const medicine = await MedicineLog.findOne({
    _id: id,
    userId: req.userId
  });

  if (!medicine) {
    return res.status(404).json({
      success: false,
      message: 'Medicine not found'
    });
  }

  // Update allowed fields
  const allowedUpdates = ['medicineName', 'dosageSchedule', 'expiryDate', 'notes', 'stockQuantity'];
  Object.keys(updates).forEach(key => {
    if (allowedUpdates.includes(key)) {
      medicine[key] = updates[key];
    }
  });

  await medicine.save();

  logger.info('Medicine log updated', { userId: req.userId, medicineId: medicine._id });

  res.json({
    success: true,
    message: 'Medicine updated successfully',
    data: { medicine }
  });
});

// Delete medicine log
export const deleteMedicineLog = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const medicine = await MedicineLog.findOneAndDelete({
    _id: id,
    userId: req.userId
  });

  if (!medicine) {
    return res.status(404).json({
      success: false,
      message: 'Medicine not found'
    });
  }

  logger.info('Medicine log deleted', { userId: req.userId, medicineId: medicine._id });

  res.json({
    success: true,
    message: 'Medicine deleted successfully'
  });
});

// Get adherence statistics
export const getAdherenceStats = asyncHandler(async (req, res) => {
  const medicines = await MedicineLog.find({
    userId: req.userId,
    status: { $in: ['active', 'low-stock'] }
  });

  const totalMedicines = medicines.length;
  const totalDoses = medicines.reduce((sum, m) => sum + m.usageHistory.length, 0);
  const totalMissed = medicines.reduce((sum, m) => sum + m.missedDoses.length, 0);
  const onTimeDoses = medicines.reduce((sum, m) =>
    sum + m.usageHistory.filter(h => h.onTime).length, 0
  );

  // Calculate overall adherence
  // If no medicines, return null (not applicable)
  // If medicines exist but no doses logged yet, return 100 (perfect score, just started)
  // If doses logged, calculate based on actual adherence scores
  let overallAdherence;
  if (totalMedicines === 0) {
    overallAdherence = null; // No medicines to track
  } else if (totalDoses === 0 && totalMissed === 0) {
    overallAdherence = null; // Medicines added but no doses logged yet
  } else {
    overallAdherence = Math.round(
      medicines.reduce((sum, m) => sum + m.adherenceScore, 0) / totalMedicines
    );
  }

  const stats = {
    overallAdherence,
    totalMedicines,
    activeMedicines: medicines.filter(m => m.status === 'active').length,
    lowStockMedicines: medicines.filter(m => m.status === 'low-stock').length,
    totalDosesTaken: totalDoses,
    totalDosesMissed: totalMissed,
    onTimeRate: totalDoses > 0 ? Math.round((onTimeDoses / totalDoses) * 100) : null,
    medicineBreakdown: medicines.map(m => ({
      id: m._id,
      name: m.medicineName,
      adherenceScore: m.adherenceScore,
      status: m.status,
      stockRemaining: m.stockQuantity.current,
      predictedStockOut: m.predictions?.stockOutDate
    }))
  };

  res.json({
    success: true,
    data: { stats }
  });
});

export default {
  createMedicineLog,
  getMedicineLogs,
  getMedicineLog,
  logDose,
  logMissedDose,
  updateMedicineLog,
  deleteMedicineLog,
  getAdherenceStats
};
