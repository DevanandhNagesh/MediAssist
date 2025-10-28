import express from 'express';
import connectDatabase from './src/config/database.js';
import logger from './src/config/logger.js';

const app = express();
const port = 5000;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  try {
    console.log('Connecting to database...');
    await connectDatabase();
    console.log('Database connected');
    
    console.log('Starting express server...');
    const server = app.listen(port, '127.0.0.1', () => {
      console.log(`Test server listening on http://127.0.0.1:${port}`);
      logger.info(`Test server listening on port ${port}`);
    });
    
    server.on('error', (error) => {
      console.error('Server error:', error);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();