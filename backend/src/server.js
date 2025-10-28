import dotenv from 'dotenv';
import app from './app.js';
import connectDatabase from './config/database.js';
import logger from './config/logger.js';

dotenv.config();

const port = process.env.PORT || 5000;

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  console.error('UNCAUGHT EXCEPTION:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  console.error('UNHANDLED REJECTION:', reason);
  process.exit(1);
});

const startServer = async() => {
  try {
    console.log('Starting MediAssist server...');
    
    // Connect to database
    console.log('Connecting to MongoDB...');
    await connectDatabase();
    console.log('MongoDB connected successfully');
    
    // Start Express server
    const server = app.listen(port, () => {
      console.log(`✅ MediAssist API listening on port ${port}`);
      logger.info(`MediAssist API listening on port ${port}`);
    });

    // Handle server errors
    server.on('error', (error) => {
      logger.error('Server error', { error: error.message });
      console.error('SERVER ERROR:', error);
      process.exit(1);
    });

    // Keep process alive
    process.stdin.resume();
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, closing server...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('\nSIGINT received, closing server...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    console.error('STARTUP ERROR:', error);
    process.exit(1);
  }
};

startServer();
