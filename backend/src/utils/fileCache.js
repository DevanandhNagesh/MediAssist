import fs from 'fs/promises';
import NodeCache from 'node-cache';
import path from 'path';
import { resolveRootPath } from './pathHelpers.js';

const cache = new NodeCache({ stdTTL: 600 });

export const readJsonFile = async(relativeOrAbsolutePath) => {
  const resolvedPath = path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : resolveRootPath(relativeOrAbsolutePath);

  const cached = cache.get(resolvedPath);
  if (cached) {
    return cached;
  }

  const content = await fs.readFile(resolvedPath, 'utf-8');
  const json = JSON.parse(content);
  cache.set(resolvedPath, json);
  return json;
};

export default {
  readJsonFile
};
