import Tesseract from 'tesseract.js';
import { parse } from 'csv-parse/sync';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let medicineDatasetCache = null;

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
      name: record['Medicine Name'] || record.name || '',
      manufacturer: record.Manufacturer || record.manufacturer || '',
      price: record['Mrp (Rs.)'] || record.price || '',
      substitutes: (record.Substitutes || record.substitutes || '').split(',').map(s => s.trim()).filter(Boolean),
      uses: (record.Uses || record.uses || '').split(',').map(s => s.trim()).filter(Boolean),
      side_effects: (record['Side_effects'] || record.side_effects || record['Side Effects'] || '').split(',').map(s => s.trim()).filter(Boolean),
      chemical_class: record['Chemical Class'] || record.chemical_class || '',
      image_url: record['Image URL'] || record.image_url || '',
      habit_forming: record['Habit Forming'] || record.habit_forming || '',
      therapeutic_class: record['Therapeutic Class'] || record.therapeutic_class || '',
      action_class: record['Action Class'] || record.action_class || ''
    }));

    logger.info(`Loaded ${medicineDatasetCache.length} medicines from dataset`);
    return medicineDatasetCache;
  } catch (error) {
    logger.error('Failed to load medicine dataset', { error: error.message });
    medicineDatasetCache = [];
    return [];
  }
};

const diceCoefficient = (str1, str2) => {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return 0;
  const bigrams1 = new Set();
  for (let i = 0; i < s1.length - 1; i++) {
    bigrams1.add(s1.substring(i, i + 2));
  }
  const bigrams2 = new Set();
  for (let i = 0; i < s2.length - 1; i++) {
    bigrams2.add(s2.substring(i, i + 2));
  }
  let intersection = 0;
  for (const bigram of bigrams1) {
    if (bigrams2.has(bigram)) intersection++;
  }
  return (2.0 * intersection) / (bigrams1.size + bigrams2.size);
};

const cleanTextForMedicineDetection = (text) => {
  const noisePatternsToRemove = [
    /\b(hospital|clinic|medical|center|dr\.|doctor|patient|age|date|address|phone|mobile|email)\b/gi,
    /\b(name|address|city|state|pin|code|tel|fax)\s*:?\s*[^\n]*/gi,
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
    /\b\d{10}\b/g,
    /\b\d{6}\b/g,
    /\b(male|female|m\/f|age|yrs?|years?)\b/gi,
    /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g
  ];
  let cleanedText = text;
  for (const pattern of noisePatternsToRemove) {
    cleanedText = cleanedText.replace(pattern, ' ');
  }
  return cleanedText;
};

const extractMedicineLikeWords = (text) => {
  const lines = text.split('\n');
  const medicineWords = [];
  const skipKeywords = /\b(hospital|clinic|patient|doctor|address|phone|date|mobile|email|signature|prescribed|take|times|day|morning|evening|night|after|before|food|meal|breakfast|lunch|dinner)\b/i;
  
  // Pattern to match medicine lines: "Tab./Cap. MedicineName dosage" or just "MedicineName dosage"
  const medicineLinePattern = /^(?:tab\.?|cap\.?|syp\.?|inj\.?|tablet|capsule|syrup|injection)?\s*([A-Za-z][A-Za-z0-9\s\-]+?)(?:\s+\d+(?:\/\d+)?(?:mg|mcg|gm|ml)?)?(?:\s+[\d\-]+)?(?:\s*(?:before|after)\s+food)?$/i;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines, pure numbers, or lines with skip keywords
    if (!trimmedLine || skipKeywords.test(trimmedLine)) continue;
    if (/^\d+[\s\-\/]*\d*[\s\-\/]*\d*$/.test(trimmedLine)) continue;
    
    // Try to match medicine pattern
    const match = trimmedLine.match(medicineLinePattern);
    if (match) {
      const medicineName = match[1].trim();
      // Clean up the medicine name
      const cleaned = medicineName.replace(/\s+\d+$/, '').trim(); // Remove trailing numbers
      if (cleaned.length >= 3 && cleaned.length <= 30) {
        medicineWords.push(cleaned);
      }
    }
    
    // Also extract words that look like medicine names (capitalized, alphanumeric)
    const words = trimmedLine.split(/[\s,;]+/).filter(word => {
      const cleaned = word.replace(/[^a-zA-Z0-9]/g, '');
      if (cleaned.length < 4 || cleaned.length > 25) return false;
      if (/^\d+$/.test(cleaned)) return false;
      
      const commonWords = ['tablet', 'capsule', 'syrup', 'take', 'daily', 'once', 'twice', 'thrice', 'morning', 'evening', 'night', 'after', 'before'];
      if (commonWords.includes(cleaned.toLowerCase())) return false;
      
      return true;
    });
    medicineWords.push(...words);
  }
  
  // Extract capitalized words (likely medicine names)
  const capitalizedPattern = /\b[A-Z][a-z]{3,24}\b/g;
  const capitalizedWords = text.match(capitalizedPattern) || [];
  const filteredCapitalized = capitalizedWords.filter(word => {
    return !['Hospital', 'Clinic', 'Doctor', 'Patient', 'Date', 'Name', 'Address', 'City', 'State', 'Phone', 'Mobile', 'Email', 'Before', 'After', 'Food', 'Meal'].includes(word);
  });
  medicineWords.push(...filteredCapitalized);
  
  return [...new Set(medicineWords)];
};

const detectMedicines = (words, dataset) => {
  logger.info('Dataset-based detection', { wordCount: words.length });
  const matches = [];
  const matchedWords = new Set();
  const threshold = 0.60; // Lower threshold for better matching
  const minWordLength = 3; // Allow shorter names
  
  for (const word of words) {
    // Try multiple variations of the word
    const variations = [
      word,
      word.replace(/^(tab|cap|syp|inj)\.?\s*/i, ''), // Remove Tab./Cap. prefix
      word.replace(/\s*\d+.*$/, ''), // Remove dosage numbers
      word.replace(/[^a-zA-Z0-9]/g, ''), // Remove all special chars
      word.split(/\s+/)[0] // Take first word only
    ];
    
    for (const variant of variations) {
      const normalizedWord = variant.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalizedWord.length < minWordLength) continue;
      if (matchedWords.has(normalizedWord)) continue; // Skip already matched
      
      let bestMatch = null;
      let bestScore = 0;
      
      for (const medicine of dataset) {
        const medicineName = medicine.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (medicineName.length < 3) continue;
        
        // Exact match
        if (normalizedWord === medicineName) {
          bestMatch = { ...medicine, matchScore: 1.0, matchedWord: word, matchType: 'exact' };
          bestScore = 1.0;
          break;
        }
        
        // Check if word is part of medicine name or vice versa
        if (normalizedWord.length >= 4 && medicineName.length >= 4) {
          if (medicineName.includes(normalizedWord) || normalizedWord.includes(medicineName)) {
            const longer = normalizedWord.length > medicineName.length ? normalizedWord : medicineName;
            const shorter = normalizedWord.length > medicineName.length ? medicineName : normalizedWord;
            const overlapRatio = shorter.length / longer.length;
            if (overlapRatio >= 0.60) {
              const score = 0.85 * overlapRatio;
              if (score > bestScore) {
                bestMatch = { ...medicine, matchScore: score, matchedWord: word, matchType: 'partial' };
                bestScore = score;
              }
            }
          }
        }
        
        // Fuzzy matching with Dice coefficient
        const similarity = diceCoefficient(normalizedWord, medicineName);
        if (similarity > bestScore && similarity >= threshold) {
          bestMatch = { ...medicine, matchScore: similarity, matchedWord: word, matchType: 'fuzzy' };
          bestScore = similarity;
        }
        
        // Check substitutes
        const substitutes = (medicine.substitutes || []).map(s => s.toLowerCase().replace(/[^a-z0-9]/g, ''));
        for (const sub of substitutes) {
          if (sub.length < 3) continue;
          if (normalizedWord === sub || sub.includes(normalizedWord) || normalizedWord.includes(sub)) {
            const score = 0.90;
            if (score > bestScore) {
              bestMatch = { ...medicine, matchScore: score, matchedWord: word, matchType: 'substitute' };
              bestScore = score;
            }
          }
        }
      }
      
      if (bestMatch && bestScore >= threshold) {
        matchedWords.add(normalizedWord);
        matches.push(bestMatch);
        break; // Stop trying variations once we find a match
      }
    }
  }
  
  matches.sort((a, b) => b.matchScore - a.matchScore);
  return matches;
};

const detectMedicinesWithAI = async (extractedText, dataset) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn('Gemini API key not configured');
      return [];
    }
    logger.info('Using AI fallback for medicine detection');
    const prompt = `Extract ONLY the medicine/drug names from this prescription text. Return a JSON array of medicine names.

Prescription text:
${extractedText}

Return format: ["Medicine1", "Medicine2", "Medicine3"]
Return ONLY the JSON array, nothing else.`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500
        }
      })
    });
    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiResponse) {
      logger.warn('No AI response received');
      return [];
    }
    const jsonMatch = aiResponse.match(/\[.*?\]/s);
    if (!jsonMatch) {
      logger.warn('Could not parse AI response');
      return [];
    }
    const medicineNames = JSON.parse(jsonMatch[0]);
    logger.info('AI extracted medicines', { count: medicineNames.length, names: medicineNames });
    const matches = [];
    for (const aiMedicineName of medicineNames) {
      const normalizedAI = aiMedicineName.toLowerCase().replace(/[^a-z0-9]/g, '');
      let bestMatch = null;
      let bestScore = 0;
      for (const medicine of dataset) {
        const medicineName = medicine.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalizedAI === medicineName) {
          bestMatch = { ...medicine, matchScore: 1.0, matchedWord: aiMedicineName, matchType: 'ai-exact' };
          bestScore = 1.0;
          break;
        }
        const substitutes = (medicine.substitutes || []).map(s => s.toLowerCase().replace(/[^a-z0-9]/g, ''));
        if (substitutes.includes(normalizedAI)) {
          bestMatch = { ...medicine, matchScore: 0.95, matchedWord: aiMedicineName, matchType: 'ai-substitute' };
          bestScore = 0.95;
          break;
        }
        const similarity = diceCoefficient(normalizedAI, medicineName);
        if (similarity > bestScore && similarity >= 0.6) {
          bestMatch = { ...medicine, matchScore: similarity, matchedWord: aiMedicineName, matchType: 'ai-fuzzy' };
          bestScore = similarity;
        }
      }
      if (bestMatch && bestScore >= 0.6) {
        matches.push(bestMatch);
      }
    }
    logger.info('AI matching complete', { matches: matches.length });
    return matches;
  } catch (error) {
    logger.error('AI detection error', { error: error.message });
    return [];
  }
};

const extractTextFromImage = async (imagePath) => {
  try {
    const { data } = await Tesseract.recognize(imagePath, 'eng', {
      logger: info => {
        if (info.status === 'recognizing text') {
          logger.debug(`OCR progress: ${Math.round(info.progress * 100)}%`);
        }
      },
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,()-/: \n',
      preserve_interword_spaces: '1'
    });
    if (data?.text) {
      logger.info('OCR extraction complete', {
        length: data.text.length,
        confidence: data.confidence
      });
      return { text: data.text, confidence: data.confidence };
    }
    return { text: '', confidence: 0 };
  } catch (error) {
    logger.error('OCR failed', { error: error.message });
    throw error;
  }
};

const generatePrescriptionExplanation = (medicines) => {
  if (medicines.length === 0) {
    return 'No medicines could be identified from this prescription.';
  }
  const medicineNames = medicines.map(m => m.name).join(', ');
  const medicineCount = medicines.length;
  let explanation = `This prescription contains ${medicineCount} medicine${medicineCount > 1 ? 's' : ''}: ${medicineNames}.\n\n`;
  explanation += 'Prescription Summary:\n';
  medicines.forEach((med, index) => {
    explanation += `\n${index + 1}. ${med.name}\n`;
    if (med.chemical_class) {
      explanation += `   - Chemical Class: ${med.chemical_class}\n`;
    }
    if (med.uses && med.uses.length > 0) {
      explanation += `   - Prescribed For: ${med.uses.slice(0, 3).join(', ')}`;
      if (med.uses.length > 3) explanation += ` and ${med.uses.length - 3} more uses`;
      explanation += '\n';
    }
    if (med.manufacturer) {
      explanation += `   - Manufacturer: ${med.manufacturer}\n`;
    }
  });
  return explanation.trim();
};

export const analyzePrescriptionImage = async (imagePath) => {
  try {
    logger.info('Starting prescription analysis', { imagePath });
    const dataset = await loadMedicineDataset();
    const { text: extractedText, confidence } = await extractTextFromImage(imagePath);
    
    if (!extractedText || extractedText.trim().length === 0) {
      return {
        explanation: 'No text could be extracted from the image.',
        medicines: [],
        extractedText: '',
        message: 'Unable to read prescription'
      };
    }
    
    logger.info('Text extraction complete', {
      textLength: extractedText.length,
      confidence
    });
    
    const cleanedText = cleanTextForMedicineDetection(extractedText);
    const potentialMedicines = extractMedicineLikeWords(cleanedText);
    
    logger.info('Potential medicines extracted', {
      count: potentialMedicines.length,
      samples: potentialMedicines.slice(0, 10)
    });
    
    // Detect medicines from dataset
    let detectedMedicines = detectMedicines(potentialMedicines, dataset);
    logger.info('Dataset detection complete', { count: detectedMedicines.length });
    
    // Try AI fallback if few medicines found
    if (detectedMedicines.length < potentialMedicines.length / 2) {
      logger.info('Trying AI fallback for better detection');
      const aiMedicines = await detectMedicinesWithAI(extractedText, dataset);
      if (aiMedicines.length > 0) {
        logger.info('AI detection successful', { count: aiMedicines.length });
        const existingNames = new Set(detectedMedicines.map(m => m.name.toLowerCase()));
        const newAIMedicines = aiMedicines.filter(m => !existingNames.has(m.name.toLowerCase()));
        detectedMedicines = [...detectedMedicines, ...newAIMedicines];
        logger.info('Combined results', { total: detectedMedicines.length });
      }
    }
    
    // Create a set of matched medicine names (normalized)
    const matchedNames = new Set(
      detectedMedicines.map(m => m.matchedWord?.toLowerCase().replace(/[^a-z0-9]/g, ''))
    );
    
    // Add unmatched medicines as "basic info only" entries
    const unmatchedMedicines = potentialMedicines.filter(word => {
      const normalized = word.toLowerCase().replace(/[^a-z0-9]/g, '');
      return normalized.length >= 3 && !matchedNames.has(normalized);
    });
    
    // Add unmatched medicines with basic info
    for (const medicineName of unmatchedMedicines) {
      detectedMedicines.push({
        name: medicineName,
        manufacturer: '',
        price: '',
        substitutes: [],
        uses: [],
        side_effects: [],
        chemical_class: '',
        habit_forming: '',
        therapeutic_class: '',
        matchScore: 0,
        matchedWord: medicineName,
        matchType: 'detected-only',
        isBasicInfo: true
      });
    }
    
    if (detectedMedicines.length === 0) {
      return {
        explanation: 'No medicines could be identified from the prescription. The handwriting may be unclear or the medicines may not be in our database.',
        medicines: [],
        extractedText,
        message: 'No medicines detected'
      };
    }
    
    // Format medicines for response
    const formattedMedicines = detectedMedicines.map(med => ({
      name: med.name,
      manufacturer: med.manufacturer || 'Not available',
      price: med.price || 'Not available',
      substitutes: med.substitutes || [],
      uses: med.uses || [],
      side_effects: med.side_effects || [],
      chemical_class: med.chemical_class || 'Not available',
      habit_forming: med.habit_forming || 'Unknown',
      therapeutic_class: med.therapeutic_class || 'Not available',
      matchScore: med.matchScore ? Math.round(med.matchScore * 100) : 0,
      detectedAs: med.matchedWord,
      isBasicInfo: med.isBasicInfo || false
    }));
    
    const explanation = generatePrescriptionExplanation(formattedMedicines);
    
    logger.info('Analysis complete', {
      medicinesFound: formattedMedicines.length,
      withFullInfo: formattedMedicines.filter(m => !m.isBasicInfo).length,
      detectedOnly: formattedMedicines.filter(m => m.isBasicInfo).length
    });
    
    return {
      explanation,
      medicines: formattedMedicines,
      extractedText,
      message: 'Prescription analyzed successfully'
    };
  } catch (error) {
    logger.error('Prescription analysis failed', { error: error.message });
    return {
      explanation: '',
      medicines: [],
      extractedText: '',
      message: `Analysis failed: ${error.message}`
    };
  }
};

export default {
  analyzePrescriptionImage
};
