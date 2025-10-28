import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import connectDatabase from '../src/config/database.js';
import Symptom from '../src/models/Symptom.js';
import Disease from '../src/models/Disease.js';
import { resolveRootPath } from '../src/utils/pathHelpers.js';

dotenv.config({ path: new URL('../.env', import.meta.url) });

const DATASETS_DIR = resolveRootPath('datasets');
const LOOKUPS_DIR = path.join(DATASETS_DIR, 'lookups');

const loadSymptomsCsv = async(csvPath) => {
  const content = await fs.readFile(csvPath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) {
    return [];
  }

  const headers = lines[0].split(',').map(header => header.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index]?.trim();
    });
    return {
      name: record.name,
      category: record.category || 'General',
      severityWeights: {
        mild: Number(record.severity_mild) || 1,
        moderate: Number(record.severity_moderate) || 2,
        severe: Number(record.severity_severe) || 3
      }
    };
  });
};

const loadDiseasesJson = async(jsonPath) => {
  const data = await fs.readFile(jsonPath, 'utf-8');
  return JSON.parse(data);
};

const seedSymptoms = async(records) => {
  let updated = 0;
  for (const record of records) {
    if (!record?.name) continue;

    await Symptom.findOneAndUpdate(
      { name: record.name },
      {
        $set: {
          category: record.category,
          severityWeights: record.severityWeights
        }
      },
      { upsert: true, new: true }
    );
    updated += 1;
  }
  return updated;
};

const seedDiseases = async(records) => {
  let updated = 0;
  for (const record of records) {
    if (!record?.name) continue;

    await Disease.findOneAndUpdate(
      { name: record.name },
      {
        $set: {
          description: record.description,
          symptoms: record.symptoms || [],
          probableSymptoms: record.probableSymptoms || [],
          severityLevel: record.severityLevel || 'medium',
          contagious: Boolean(record.contagious),
          riskFactors: record.riskFactors || [],
          recommendedActions: record.recommendedActions || [],
          lastUpdated: new Date()
        }
      },
      { upsert: true, new: true }
    );
    updated += 1;
  }
  return updated;
};

const run = async() => {
  const symptomsCsvPath = path.join(LOOKUPS_DIR, 'symptoms.csv');
  const diseasesJsonPath = path.join(LOOKUPS_DIR, 'diseases.json');

  console.log('Loading datasets from:', LOOKUPS_DIR);

  const [symptomRecords, diseaseRecords] = await Promise.all([
    loadSymptomsCsv(symptomsCsvPath),
    loadDiseasesJson(diseasesJsonPath)
  ]);

  console.log(`Loaded ${symptomRecords.length} symptom records and ${diseaseRecords.length} disease records`);

  await connectDatabase();

  const [symptomCount, diseaseCount] = await Promise.all([
    seedSymptoms(symptomRecords),
    seedDiseases(diseaseRecords)
  ]);

  console.log(`Seeded ${symptomCount} symptoms and ${diseaseCount} diseases`);
};

run()
  .then(() => mongoose.connection.close())
  .catch(error => {
    console.error('Seeding failed:', error);
    mongoose.connection.close().catch(() => {});
    process.exit(1);
  });
