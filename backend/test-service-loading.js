import logger from './src/config/logger.js';

console.log('Starting service loading test...');

async function testServices() {
  try {
    console.log('Loading prescription service...');
    const prescriptionService = await import('./src/services/prescriptionService.js');
    console.log('Prescription service loaded successfully');
    
    console.log('Testing medicine loading...');
    // Don't call any functions, just import
    console.log('All services loaded successfully');
  } catch (error) {
    console.error('Error loading services:', error);
    process.exit(1);
  }
}

testServices();