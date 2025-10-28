import NodeCache from 'node-cache';
import Disease from '../models/Disease.js';
import UserQuery from '../models/UserQuery.js';
import logger from '../config/logger.js';
import { readJsonFile } from '../utils/fileCache.js';

// Disabled TensorFlow to prevent server crashes
// let tfModule;
// try {
//   tfModule = await import('@tensorflow/tfjs-node');
// } catch (error) {
//   tfModule = await import('@tensorflow/tfjs');
// }
// const tf = tfModule.default || tfModule;

const analysisCache = new NodeCache({ stdTTL: 300 });
const entityCache = new NodeCache({ stdTTL: 600 });

const normalizeSymptomKey = (value) => {
  if (!value && value !== 0) {
    return '';
  }

  return value
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

const sanitizeSymptomInput = (symptoms = []) => {
  return symptoms
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
};

const buildSymptomKeyMap = (symptomIndex = []) => {
  const map = new Map();
  symptomIndex.forEach(item => {
    const key = normalizeSymptomKey(item);
    if (key && !map.has(key)) {
      map.set(key, item);
    }
  });
  return map;
};

const getAllDiseases = async() => {
  const cached = entityCache.get('diseases:all');
  if (cached) {
    return cached;
  }

  const records = await Disease.find({}).lean();
  entityCache.set('diseases:all', records);
  return records;
};

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const isLowSignalPredictionSet = (predictions, matchedSymptomRatio = 1) => {
  if (!predictions?.length) {
    return true;
  }

  const confidences = predictions.map(item => Number(item.confidence) || 0);
  const maxConfidence = Math.max(...confidences);
  const minConfidence = Math.min(...confidences);

  if (!Number.isFinite(maxConfidence) || !Number.isFinite(minConfidence)) {
    return true;
  }

  if (maxConfidence < 0.3) {
    return true;
  }

  if ((maxConfidence - minConfidence) <= 0.05) {
    return true;
  }

  if (matchedSymptomRatio < 0.25) {
    return true;
  }

  return false;
};

const mergePredictionLists = (primary = [], fallback = [], options = {}) => {
  const {
    primaryWeight = 0.65,
    fallbackWeight = 0.35,
    limit = 5
  } = options;

  if (!primary.length && !fallback.length) {
    return [];
  }

  const combined = new Map();

  primary.forEach((item) => {
    if (!item?.disease) return;
    const key = item.disease.toLowerCase();
    combined.set(key, {
      disease: item.disease,
      score: (Number(item.confidence) || 0) * primaryWeight,
      description: item.description,
      severity: item.severity,
      recommendedActions: Array.isArray(item.recommendedActions) ? [...item.recommendedActions] : [],
      sources: { primary: true }
    });
  });

  fallback.forEach((item) => {
    if (!item?.disease) return;
    const key = item.disease.toLowerCase();
    const fallbackContribution = (Number(item.confidence) || 0.6) * fallbackWeight;
    const existing = combined.get(key);

    if (existing) {
      existing.score += fallbackContribution;
      existing.description = existing.description || item.description;
      existing.severity = existing.severity || item.severity;
      if (Array.isArray(item.recommendedActions)) {
        const mergedActions = new Set([...(existing.recommendedActions || []), ...item.recommendedActions]);
        existing.recommendedActions = Array.from(mergedActions);
      }
      existing.sources.fallback = true;
    } else {
      combined.set(key, {
        disease: item.disease,
        score: fallbackContribution,
        description: item.description,
        severity: item.severity,
        recommendedActions: Array.isArray(item.recommendedActions) ? [...item.recommendedActions] : [],
        sources: { fallback: true }
      });
    }
  });

  const merged = Array.from(combined.values());
  const totalScore = merged.reduce((sum, item) => sum + item.score, 0) || 1;

  return merged
    .map(item => ({
      disease: item.disease,
      confidence: Number(clamp(item.score / totalScore).toFixed(2)),
      description: item.description,
      severity: item.severity,
      recommendedActions: item.recommendedActions,
      sources: item.sources
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
};

// Load symptom model from JSON file
const loadSymptomModel = async(modelPath) => {
  return readJsonFile(modelPath);
};

const loadSymptomModelWithFallback = async() => {
  const candidates = [];
  if (process.env.SYMPTOM_MODEL_PATH) {
    candidates.push(process.env.SYMPTOM_MODEL_PATH);
  }
  candidates.push('datasets/models/symptom_model/model.json', 'datasets/models/symptom_model.json');

  let lastError;
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return await loadSymptomModel(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to load symptom model with provided paths');
};

const ensureMetadataCompleteness = (metadata, modelInfo) => {
  if (!metadata.symptomIndex || !metadata.symptomIndex.length) {
    metadata.symptomIndex = Array.isArray(modelInfo?.vocab)
      ? modelInfo.vocab
      : metadata.symptomIndex || [];
  }

  if (!metadata.labels || !metadata.labels.length) {
    metadata.labels = modelInfo?.priors
      ? Object.keys(modelInfo.priors)
      : metadata.labels || [];
  }

  metadata.top_k = metadata.top_k || 5;
  return metadata;
};

const computeNaiveBayesPredictions = (modelInfo, symptomList, metadata) => {
  const diseases = Object.keys(modelInfo.priors || {});
  if (!diseases.length) {
    return [];
  }

  const laplace = Number.isFinite(modelInfo.laplace) ? modelInfo.laplace : 1;
  const scores = diseases.map(disease => {
    const diseaseLikelihoods = modelInfo.likelihoods?.[disease] || {};
    let logScore = Math.log(modelInfo.priors[disease] || Number.EPSILON);

    symptomList.forEach(symptom => {
      const likelihood = diseaseLikelihoods[symptom];
      const adjusted = typeof likelihood === 'number' && likelihood > 0
        ? likelihood
        : laplace / ((laplace * 2) || 1);
      logScore += Math.log(adjusted);
    });

    return { disease, logScore };
  });

  const maxLog = Math.max(...scores.map(item => item.logScore));
  const normalized = scores.map(item => ({
    disease: item.disease,
    confidence: Math.exp(item.logScore - maxLog)
  }));

  const total = normalized.reduce((sum, item) => sum + item.confidence, 0) || 1;

  return normalized
    .map(item => ({
      disease: item.disease,
      confidence: Number((item.confidence / total).toFixed(2))
    }))
    .filter(item => item.confidence > 0.01)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, metadata.top_k || 5);
};

const loadSymptomMetadata = async() => {
  const metadataPath = process.env.SYMPTOM_METADATA_PATH || 'datasets/models/symptom_metadata.json';
  return readJsonFile(metadataPath);
};

const buildSymptomVector = (symptomList, symptomIndex) => {
  return symptomIndex.map(symptom => (symptomList.includes(symptom) ? 1 : 0));
};

const inferDiseaseFallback = async(symptomList) => {
  const normalizedTargets = new Set(symptomList.map(normalizeSymptomKey).filter(Boolean));
  if (!normalizedTargets.size) {
    return [];
  }

  const diseases = await getAllDiseases();
  const matchedDiseases = diseases
    .map(disease => {
      const diseaseSymptoms = [
        ...(Array.isArray(disease.symptoms) ? disease.symptoms : []),
        ...(Array.isArray(disease.probableSymptoms) ? disease.probableSymptoms : [])
      ];

      const diseaseKeys = diseaseSymptoms.map(normalizeSymptomKey).filter(Boolean);
      if (!diseaseKeys.length) {
        return null;
      }

      const matches = diseaseKeys.filter(key => normalizedTargets.has(key));
      if (!matches.length) {
        return null;
      }

      const score = matches.length / Math.max(diseaseKeys.length, 1);

      return {
        disease: disease.name,
        description: disease.description,
        confidence: Number(score.toFixed(2)),
        severity: disease.severityLevel,
        recommendedActions: Array.isArray(disease.recommendedActions) ? disease.recommendedActions : []
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);

  return matchedDiseases;
};

export const analyzeSymptoms = async({ symptoms = [], age, gender, duration }) => {
  const sanitizedSymptoms = sanitizeSymptomInput(symptoms);
  if (!sanitizedSymptoms.length) {
    throw Object.assign(new Error('At least one symptom is required'), { status: 400 });
  }

  const normalizedKeys = sanitizedSymptoms.map(normalizeSymptomKey).filter(Boolean);
  const cacheKeyParts = normalizedKeys.length ? Array.from(new Set(normalizedKeys)).sort() : sanitizedSymptoms.sort();
  const cacheKey = `analysis:${cacheKeyParts.join('|')}:${age || 'na'}:${gender || 'na'}`;
  const cached = analysisCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const modelInfo = await loadSymptomModelWithFallback();
  const metadata = ensureMetadataCompleteness(await loadSymptomMetadata(), modelInfo);
  const symptomKeyMap = buildSymptomKeyMap(metadata.symptomIndex);

  const resolvedSymptoms = [];
  const matchedSymptoms = [];
  const unmatchedSymptoms = [];

  sanitizedSymptoms.forEach(original => {
    const key = normalizeSymptomKey(original);
    const resolved = symptomKeyMap.get(key);
    if (resolved) {
      matchedSymptoms.push(original);
      if (!resolvedSymptoms.includes(resolved)) {
        resolvedSymptoms.push(resolved);
      }
    } else {
      unmatchedSymptoms.push(original);
    }
  });

  const modelSymptoms = resolvedSymptoms;
  const inferenceSymptoms = modelSymptoms.length ? modelSymptoms : sanitizedSymptoms;
  const matchedRatio = sanitizedSymptoms.length ? matchedSymptoms.length / sanitizedSymptoms.length : 1;

  // TensorFlow disabled - using Naive Bayes only
  // const inputVector = buildSymptomVector(modelSymptoms, metadata.symptomIndex);

  let predictions = [];
  let lowSignal = false;

  try {
    predictions = computeNaiveBayesPredictions(modelInfo, modelSymptoms, metadata);
    lowSignal = isLowSignalPredictionSet(predictions, matchedRatio);
  } catch (error) {
    logger.warn('Falling back to heuristic disease inference', { error: error.message });
    predictions = await inferDiseaseFallback(inferenceSymptoms);
  }

  let fallbackPredictions = [];

  if (lowSignal || !predictions.length) {
    fallbackPredictions = await inferDiseaseFallback(inferenceSymptoms);
  } else if (modelSymptoms.length) {
    fallbackPredictions = await inferDiseaseFallback(modelSymptoms);
  }

  if (fallbackPredictions.length) {
    const weights = lowSignal
      ? { primaryWeight: 0.45, fallbackWeight: 0.55, limit: metadata.top_k || 5 }
      : { primaryWeight: 0.65, fallbackWeight: 0.35, limit: metadata.top_k || 5 };
    predictions = mergePredictionLists(predictions, fallbackPredictions, weights);
  }

  if (!predictions.length) {
    predictions = metadata.commonFallbacks
      ? metadata.commonFallbacks.map(item => ({ ...item, confidence: item.confidence || 0.2 }))
      : [];
  }

  const result = {
    predictions,
    recommendedActions: deriveRecommendations(predictions),
    visualization: buildVisualization(predictions),
    inputs: {
      requested: sanitizedSymptoms,
      normalized: modelSymptoms,
      matchedSymptoms,
      unmatchedSymptoms
    }
  };

  await UserQuery.create({
    queryText: symptoms.join(', '),
    queryType: 'symptom',
    response: result,
    metadata: { age, gender, duration }
  });

  analysisCache.set(cacheKey, result);
  return result;
};

const deriveRecommendations = (predictions) => {
  if (predictions.length) {
    return predictions.flatMap(prediction => prediction.recommendedActions || []).slice(0, 5);
  }
  return ['Monitor symptoms', 'Schedule a consultation if symptoms persist'];
};

const buildVisualization = (predictions) => {
  const probable = [];
  const possible = [];

  predictions.forEach(prediction => {
    if (prediction.confidence >= 0.6) {
      probable.push(prediction);
    } else if (prediction.confidence >= 0.3) {
      possible.push(prediction);
    }
  });

  return {
    probable,
    possible,
    labels: predictions.map(item => item.disease),
    data: predictions.map(item => item.confidence)
  };
};

export const getSymptomMetadata = async() => {
  const modelInfo = await loadSymptomModelWithFallback();
  const metadata = ensureMetadataCompleteness(await loadSymptomMetadata(), modelInfo);
  return {
    symptoms: metadata.symptomIndex,
    categories: metadata.categories,
    version: metadata.version || '1.0.0'
  };
};

export default {
  analyzeSymptoms,
  getSymptomMetadata
};
