import mongoose from 'mongoose';
import logger from './logger.js';

const connectDatabase = async() => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined');
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000
    });
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('MongoDB connection error', { error: error.message });
    throw error;
  }
};

export default connectDatabase;
