import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const SOURCE_FILE = path.resolve(projectRoot, '../datasets/raw/Extensive_A_Z_medicines_dataset_of_India.csv');
const TARGET_FILE = path.resolve(projectRoot, '../datasets/lookups/medicines.json');

const NORMALIZE_TEXT_REGEX = /[^a-z0-9+\-\s]/g;
const DOSAGE_TOKEN_REGEX = /\b\d+(?:\s)*(?:mg|ml|mcg|iu|g|kg|tablets|capsules|syrup)?\b/gi;

const normalizeTerm = (value) => {
  if (!value) {
    return '';
  }

  const lowered = value
    .toLowerCase()
    .replace(/\u20b9|â‚¹|rs\.?/gi, '')
    .replace(/\u00ae|\u2122/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return lowered
    .replace(NORMALIZE_TEXT_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const buildSearchTerms = (terms) => {
  const bag = new Set();

  const push = (raw) => {
    const normalized = normalizeTerm(raw);
    if (normalized) {
      bag.add(normalized);
      const stripped = normalized.replace(DOSAGE_TOKEN_REGEX, '').replace(/\s+/g, ' ').trim();
      if (stripped && stripped !== normalized) {
        bag.add(stripped);
      }
    }
  };

  terms.forEach(push);

  return Array.from(bag);
};

const splitList = (value) => {
  if (!value) {
    return [];
  }

  return value
    .split(/[,;]+/)
    .map(item => item.replace(/^[\s"']+|[\s"']+$/g, '').trim())
    .filter(Boolean);
};

const parseBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (!value) {
    return null;
  }

  const normalized = value.toString().toLowerCase();
  if (['yes', 'true', 'y'].includes(normalized)) {
    return true;
  }
  if (['no', 'false', 'n'].includes(normalized)) {
    return false;
  }
  return null;
};

const parsePrice = (value) => {
  if (!value) {
    return null;
  }

  const normalized = value
    .toString()
    .replace(/[^0-9.]/g, '')
    .trim();

  if (!normalized) {
    return null;
  }

  const numeric = Number.parseFloat(normalized);
  if (Number.isNaN(numeric)) {
    return null;
  }

  return Number(numeric.toFixed(2));
};

const buildRecord = (row) => {
  const name = row.name?.trim();
  if (!name) {
    return null;
  }

  const substitutes = [];
  for (let i = 0; i <= 4; i += 1) {
    const key = `substitute${i}`;
    if (row[key]) {
      substitutes.push(row[key]);
    }
  }

  const compositions = [];
  for (let i = 1; i <= 2; i += 1) {
    const key = `short_composition${i}`;
    if (row[key]) {
      compositions.push(row[key].trim());
    }
  }

  const uses = [];
  for (let i = 0; i <= 4; i += 1) {
    const key = `use${i}`;
    if (row[key]) {
      uses.push(row[key].trim());
    }
  }

  const sideEffects = splitList(row.Consolidated_Side_Effects);

  const price = parsePrice(row['price(â‚¹)'] ?? row.price);

  const record = {
    id: row.id?.trim() || null,
    name,
    normalizedName: normalizeTerm(name),
    searchTerms: buildSearchTerms([name, ...substitutes]),
    manufacturer: row.manufacturer_name?.trim() || null,
    type: row.type?.trim() || null,
    packSize: row.pack_size_label?.trim() || null,
    compositions,
    substitutes: substitutes.map(item => item.trim()),
    price: price !== null ? { value: price, currency: 'INR' } : null,
    isDiscontinued: parseBoolean(row.Is_discontinued),
    sideEffects,
    uses,
    chemicalClass: row['Chemical Class']?.trim() || null,
    habitForming: parseBoolean(row['Habit Forming']),
    therapeuticClass: row['Therapeutic Class']?.trim() || null,
    actionClass: row['Action Class']?.trim() || null
  };

  return record;
};

async function ensureTargetDirectory(targetPath) {
  const directory = path.dirname(targetPath);
  await fsp.mkdir(directory, { recursive: true });
}

const mergeStringArrays = (target = [], source = []) => {
  const bag = new Set(target.filter(Boolean).map(item => item.trim()));
  source.filter(Boolean).forEach(item => bag.add(item.trim()));
  return Array.from(bag);
};

const mergeSearchTerms = (targetTerms = [], sourceTerms = []) => {
  const combined = buildSearchTerms([...targetTerms, ...sourceTerms]);
  return combined;
};

const mergeRecord = (existing, incoming) => {
  const merged = { ...existing };

  merged.searchTerms = mergeSearchTerms(existing.searchTerms, incoming.searchTerms);
  merged.substitutes = mergeStringArrays(existing.substitutes, incoming.substitutes);
  merged.compositions = mergeStringArrays(existing.compositions, incoming.compositions);
  merged.uses = mergeStringArrays(existing.uses, incoming.uses);
  merged.sideEffects = mergeStringArrays(existing.sideEffects, incoming.sideEffects);

  if (!merged.price && incoming.price) {
    merged.price = incoming.price;
  }

  if (!merged.manufacturer && incoming.manufacturer) {
    merged.manufacturer = incoming.manufacturer;
  }

  if (!merged.type && incoming.type) {
    merged.type = incoming.type;
  }

  if (!merged.packSize && incoming.packSize) {
    merged.packSize = incoming.packSize;
  }

  if (merged.isDiscontinued === null) {
    merged.isDiscontinued = incoming.isDiscontinued;
  }

  if (merged.habitForming === null) {
    merged.habitForming = incoming.habitForming;
  }

  if (!merged.chemicalClass && incoming.chemicalClass) {
    merged.chemicalClass = incoming.chemicalClass;
  }

  if (!merged.therapeuticClass && incoming.therapeuticClass) {
    merged.therapeuticClass = incoming.therapeuticClass;
  }

  if (!merged.actionClass && incoming.actionClass) {
    merged.actionClass = incoming.actionClass;
  }

  return merged;
};

const buildDataset = () => new Promise((resolve, reject) => {
  const records = new Map();
  const parser = parse({
    columns: true,
    skip_empty_lines: true
  });

  parser.on('readable', () => {
    let row;
    while ((row = parser.read()) !== null) {
      const record = buildRecord(row);
      if (record) {
        const key = record.normalizedName || record.name.toLowerCase();
        if (records.has(key)) {
          const merged = mergeRecord(records.get(key), record);
          records.set(key, merged);
        } else {
          records.set(key, record);
        }
      }
    }
  });

  parser.on('error', reject);
  parser.on('end', () => resolve(Array.from(records.values())));

  fs.createReadStream(SOURCE_FILE)
    .on('error', reject)
    .pipe(parser);
});

async function main() {
  console.info('[prepare:medicines] Reading source dataset', SOURCE_FILE);
  const records = await buildDataset();
  console.info(`[prepare:medicines] Parsed ${records.length} medicine records`);

  await ensureTargetDirectory(TARGET_FILE);
  await fsp.writeFile(TARGET_FILE, JSON.stringify(records, null, 2), 'utf8');
  console.info('[prepare:medicines] Wrote lookup dataset to', TARGET_FILE);
}

main().catch((error) => {
  console.error('[prepare:medicines] Failed to build dataset', error);
  process.exitCode = 1;
});
