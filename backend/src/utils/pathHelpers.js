import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolveProjectRoot = () => path.resolve(__dirname, '../../..');

export const resolveDatasetPath = relativePath => {
  return path.resolve(resolveProjectRoot(), 'datasets', relativePath);
};

export const resolveRootPath = relativePath => {
  return path.resolve(resolveProjectRoot(), relativePath);
};
