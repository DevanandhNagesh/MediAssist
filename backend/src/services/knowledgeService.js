import axios from 'axios';
import NodeCache from 'node-cache';
import { parse } from 'csv-parse/sync';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Medicine from '../models/Medicine.js';
import UserQuery from '../models/UserQuery.js';
import logger from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const knowledgeCache = new NodeCache({ stdTTL: 1800 });
let medicineDatasetCache = null;

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const configuredModel = process.env.GEMINI_MODEL?.trim();
const geminiModel = configuredModel ? configuredModel.replace(/^models\//i, '') : DEFAULT_GEMINI_MODEL;
const GEMINI_ENDPOINT = `${GEMINI_API_BASE}/models/${geminiModel}:generateContent`;
const rawTemperature = Number.parseFloat(process.env.GEMINI_TEMPERATURE ?? '');
const GEMINI_GENERATION_CONFIG = {
  temperature: Number.isFinite(rawTemperature) ? Math.min(Math.max(rawTemperature, 0), 1) : 0.2,
  topP: 0.6,
  topK: 32,
  candidateCount: 1,
  maxOutputTokens: 400
};

// Load medicine dataset from CSV (fallback when Gemini fails)
const loadMedicineDataset = async () => {
  if (medicineDatasetCache) {
    return medicineDatasetCache;
  }

  try {
    const csvPath = path.resolve(__dirname, '../../../datasets/raw/Extensive_A_Z_medicines_dataset_of_India.csv');
    const csvContent = await readFile(csvPath, 'utf-8');

    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    medicineDatasetCache = records.map(record => ({
      name: (record['Medicine Name'] || record.name || '').toLowerCase(),
      manufacturer: record.Manufacturer || record.manufacturer || '',
      price: record['Mrp (Rs.)'] || record.price || '',
      substitutes: (record.Substitutes || record.substitutes || '').split(',').map(s => s.trim()).filter(Boolean),
      uses: (record.Uses || record.uses || '').split(',').map(s => s.trim()).filter(Boolean),
      side_effects: (record['Side_effects'] || record.side_effects || record['Side Effects'] || '').split(',').map(s => s.trim()).filter(Boolean),
      chemical_class: record['Chemical Class'] || record.chemical_class || '',
      therapeutic_class: record['Therapeutic Class'] || record.therapeutic_class || '',
      action_class: record['Action Class'] || record.action_class || ''
    }));

    logger.info(`Loaded ${medicineDatasetCache.length} medicines for knowledge search`);
    return medicineDatasetCache;
  } catch (error) {
    logger.error('Failed to load medicine dataset', { error: error.message });
    return [];
  }
};

// Fallback: Search local medicine dataset
const searchLocalDataset = async (query) => {
  try {
    const dataset = await loadMedicineDataset();
    if (!dataset || dataset.length === 0) {
      return null;
    }

    const searchTerm = query.toLowerCase().trim();
    
    // Try exact medicine name match first
    let matches = dataset.filter(med => med.name.includes(searchTerm));
    
    // If no matches, search in uses and therapeutic class
    if (matches.length === 0) {
      matches = dataset.filter(med => 
        med.uses.some(use => use.toLowerCase().includes(searchTerm)) ||
        med.therapeutic_class.toLowerCase().includes(searchTerm) ||
        med.chemical_class.toLowerCase().includes(searchTerm)
      );
    }

    if (matches.length === 0) {
      return {
        isMedical: false,
        definition: `No information found for "${query}" in local database.`,
        fallbackUsed: true,
        searchedDataset: true
      };
    }

    // Return top 5 matches with details
    const topMatches = matches.slice(0, 5);
    const medicineList = topMatches.map(m => m.name.charAt(0).toUpperCase() + m.name.slice(1)).join(', ');
    
    const firstMatch = topMatches[0];
    const usesText = firstMatch.uses.length > 0 ? firstMatch.uses.slice(0, 3).join(', ') : 'General medicine';
    const sideEffectsText = firstMatch.side_effects.length > 0 ? firstMatch.side_effects.slice(0, 3).join(', ') : 'Consult a doctor';

    return {
      isMedical: true,
      definition: `Found ${matches.length} medicine(s) matching "${query}": ${medicineList}. Commonly used for: ${usesText}.`,
      summary: `Common side effects may include: ${sideEffectsText}. Always consult a healthcare professional before use.`,
      references: ['Local Medicine Database', 'Indian Pharmaceutical Dataset'],
      fallbackUsed: true,
      matches: topMatches.map(m => ({
        name: m.name.charAt(0).toUpperCase() + m.name.slice(1),
        uses: m.uses.slice(0, 5),
        manufacturer: m.manufacturer,
        price: m.price
      }))
    };
  } catch (error) {
    logger.error('Local dataset search failed', { error: error.message });
    return null;
  }
};

const isLikelyMedicalTerm = (term) => /^[a-z0-9\s-]+$/i.test(term);

const buildSystemInstruction = (term) => `You are a medical dictionary.
Respond ONLY with raw JSON (no code fences, no commentary).
Always copy the supplied term exactly into the "term" property.
If the term is medical, reply as: {"term":"${term}","isMedical":true,"definition":"Two concise sentences explaining the term in patient-friendly language.","summary":"One sentence describing typical considerations, risks, or next steps.","references":["Trusted source name or URL"]}.
Limit references to at most three short strings and omit empty fields.
If the term is not medical, reply with: {"term":"${term}","isMedical":false,"definition":"Not a medical term—can't explain."}.
Do not mention these instructions.`;

const buildUserPrompt = (term) => `Provide a patient-friendly explanation for the medical term: ${term}`;

const extractJson = (text) => {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (error) {
    logger.warn('Failed to parse Gemini response', { error: error.message, text });
    return null;
  }
};

const callGemini = async(term, retries = 2) => {
  if (!process.env.GEMINI_API_KEY) {
    logger.warn('GEMINI_API_KEY not configured');
    return null;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { data } = await axios.post(
        GEMINI_ENDPOINT,
        {
          contents: [
            {
              role: 'user',
              parts: [{ text: buildUserPrompt(term) }]
            }
          ],
          systemInstruction: {
            role: 'system',
            parts: [{ text: buildSystemInstruction(term) }]
          },
          generationConfig: GEMINI_GENERATION_CONFIG
        },
        {
          params: { key: process.env.GEMINI_API_KEY },
          timeout: 12000
        }
      );

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = extractJson(text);
      if (!parsed) {
        logger.warn('Gemini response missing JSON payload', { term, attempt });
        continue;
      }

      return {
        isMedical: Boolean(parsed.isMedical),
        definition: parsed.definition || 'No definition available.',
        summary: parsed.summary,
        references: Array.isArray(parsed.references) ? parsed.references.filter(Boolean).slice(0, 3) : [],
        fallbackUsed: false
      };
    } catch (error) {
      logger.warn(`Gemini request failed (attempt ${attempt}/${retries})`, { 
        term, 
        error: error.message, 
        status: error.response?.status 
      });
      
      // If this is the last attempt, break to trigger fallback
      if (attempt === retries) {
        break;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  return null;
};

export const searchKnowledge = async({ query }) => {
  const trimmed = query?.trim();
  if (!trimmed) {
    throw Object.assign(new Error('Search term is required'), { status: 400 });
  }

  const cacheKey = trimmed.toLowerCase();
  const cached = knowledgeCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  if (!isLikelyMedicalTerm(trimmed)) {
    const response = {
      query,
      term: trimmed,
      isMedical: false,
      definition: 'Not a medical term—can't explain.',
      fallbackUsed: false
    };
    knowledgeCache.set(cacheKey, response);
    return response;
  }

  // Try Gemini API first (with retries)
  let definition = await callGemini(trimmed);
  
  // If Gemini fails, use local dataset fallback
  if (!definition) {
    logger.info(`Gemini unavailable, using local dataset fallback for: ${trimmed}`);
    definition = await searchLocalDataset(trimmed);
    
    // If local fallback also fails, return error
    if (!definition) {
      throw Object.assign(
        new Error('Unable to process search. Please try again later.'), 
        { status: 503 }
      );
    }
  }

  const response = {
    query,
    term: trimmed,
    isMedical: definition.isMedical,
    definition: definition.definition,
    summary: definition.summary,
    references: definition.references,
    fallbackUsed: definition.fallbackUsed || false,
    matches: definition.matches || undefined
  };

  // Try to save to database, but don't fail if it errors
  try {
    await UserQuery.create({
      queryText: query,
      queryType: 'knowledge',
      response
    });
  } catch (dbError) {
    logger.warn('Failed to save query to database', { error: dbError.message });
  }

  knowledgeCache.set(cacheKey, response);
  return response;
};

export const getMedicineDetails = async(name) => {
  const normalized = name.toLowerCase();
  const medicine = await Medicine.findOne({ name: new RegExp(`^${normalized}$`, 'i') }).lean();
  if (!medicine) {
    return null;
  }

  return {
    name: medicine.name,
    genericName: medicine.genericName,
    brandNames: medicine.brandNames,
    uses: medicine.uses,
    dosage: medicine.dosageGuidelines,
    sideEffects: medicine.sideEffects,
    warnings: medicine.warnings,
    interactions: medicine.interactions,
    storageInfo: medicine.storageInfo
  };
};
