import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDatabase from '../src/config/database.js';
import { analyzeSymptoms } from '../src/services/symptomService.js';

dotenv.config({ path: new URL('../.env', import.meta.url) });

const scenarios = [
  { name: 'flu-like', symptoms: ['high fever', 'cough', 'headache', 'fatigue'] },
  { name: 'dermatology', symptoms: ['skin rash', 'itching', 'joint pain'] },
  { name: 'digestive', symptoms: ['abdominal pain', 'vomiting', 'diarrhoea'] }
];

const run = async() => {
  await connectDatabase();

  for (const scenario of scenarios) {
    const result = await analyzeSymptoms({ symptoms: scenario.symptoms });
    console.log(`\nScenario: ${scenario.name}`);
    console.log('Symptoms:', scenario.symptoms.join(', '));
    console.log('Predictions:', result.predictions.map(item => `${item.disease} (${item.confidence})`).join(' | '));
    console.log('Matched symptoms:', result.inputs.matchedSymptoms.join(', '));
    if (result.inputs.unmatchedSymptoms.length) {
      console.log('Unmatched symptoms:', result.inputs.unmatchedSymptoms.join(', '));
    }
  }

  await mongoose.connection.close();
};

run().catch(error => {
  console.error('Test run failed:', error);
  mongoose.connection.close().catch(() => {});
  process.exit(1);
});
