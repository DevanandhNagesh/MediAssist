import mongoose from 'mongoose';

const medicineLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  medicineName: {
    type: String,
    required: [true, 'Medicine name is required'],
    trim: true
  },
  dosageSchedule: {
    frequency: {
      type: String,
      enum: ['once-daily', 'twice-daily', 'thrice-daily', 'as-needed', 'custom'],
      default: 'once-daily'
    },
    times: [{
      type: String, // e.g., "08:00", "14:00", "20:00"
      trim: true
    }],
    dosageAmount: {
      type: String,
      trim: true // e.g., "1 tablet", "5ml"
    }
  },
  expiryDate: {
    type: Date,
    required: [true, 'Expiry date is required']
  },
  stockQuantity: {
    current: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    initial: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      default: 'tablets'
    }
  },
  usageHistory: [{
    takenAt: {
      type: Date,
      required: true
    },
    scheduledTime: String,
    onTime: Boolean,
    quantity: Number,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  missedDoses: [{
    scheduledTime: Date,
    detectedAt: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  predictions: {
    stockOutDate: Date,
    lastCalculated: Date,
    averageDailyUsage: Number
  },
  adherenceScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  status: {
    type: String,
    enum: ['active', 'low-stock', 'out-of-stock', 'expired', 'completed'],
    default: 'active'
  },
  notes: {
    type: String,
    maxlength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
medicineLogSchema.index({ userId: 1, status: 1 });
medicineLogSchema.index({ userId: 1, expiryDate: 1 });

// Calculate adherence score before saving
medicineLogSchema.pre('save', function (next) {
  if (this.usageHistory.length > 0) {
    const totalScheduled = this.usageHistory.length + this.missedDoses.length;
    const taken = this.usageHistory.length;
    const onTimeDoses = this.usageHistory.filter(h => h.onTime).length;
    
    // Score = (doses taken / total scheduled) * 70% + (on-time / taken) * 30%
    const adherenceRate = (taken / totalScheduled) * 70;
    const punctualityRate = taken > 0 ? (onTimeDoses / taken) * 30 : 0;
    
    this.adherenceScore = Math.round(adherenceRate + punctualityRate);
  }
  next();
});

// Method to update stock
medicineLogSchema.methods.updateStock = function (quantityUsed) {
  this.stockQuantity.current = Math.max(0, this.stockQuantity.current - quantityUsed);
  
  // Update status
  if (this.stockQuantity.current === 0) {
    this.status = 'out-of-stock';
  } else if (this.stockQuantity.current <= this.stockQuantity.initial * 0.2) {
    this.status = 'low-stock';
  }
  
  return this.save();
};

// Method to predict stock-out date
medicineLogSchema.methods.predictStockOut = function () {
  if (this.usageHistory.length < 3) {
    return null; // Not enough data
  }
  
  // Calculate average daily usage from last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentUsage = this.usageHistory.filter(h => h.takenAt >= sevenDaysAgo);
  
  if (recentUsage.length === 0) {
    return null;
  }
  
  const totalUsed = recentUsage.reduce((sum, h) => sum + (h.quantity || 1), 0);
  const avgDailyUsage = totalUsed / 7;
  
  if (avgDailyUsage === 0) {
    return null;
  }
  
  const daysRemaining = Math.floor(this.stockQuantity.current / avgDailyUsage);
  const stockOutDate = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000);
  
  this.predictions = {
    stockOutDate,
    lastCalculated: new Date(),
    averageDailyUsage: avgDailyUsage
  };
  
  return stockOutDate;
};

const MedicineLog = mongoose.model('MedicineLog', medicineLogSchema);

export default MedicineLog;
