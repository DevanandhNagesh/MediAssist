import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');
const requireFromBackend = createRequire(path.join(projectRoot, 'backend', 'package.json'));
const requireFromRoot = createRequire(path.join(projectRoot, 'package.json'));

const BASE_CHARACTERS = '()+,-.0123456789ABCDEFGHIKLMNOPRSTVZ_abcdefghiklmnoprstuvxyz';
const FALLBACK_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 -/&%$#@!?:;.,'\"";

let symbolTableCache = null;
let symbolTableSize = null;
let modelEnvironmentPromise = null;
let tensorflowModuleCache = null;
let runtimeTag = null;
let runtimeLogged = false;

let customLayerRegistered = false;
let fileFetchPatched = false;
let sharpModulePromise = null;

const registerCustomObjects = (tf) => {
  if (customLayerRegistered) {
    return;
  }

  const registerFn = tf?.serialization?.registerClass;
  const baseLayer = tf?.layers?.Layer;
  if (typeof registerFn !== 'function' || typeof baseLayer !== 'function') {
    return;
  }

  class CTCLossLayer extends baseLayer {
    static className = 'CTCLossLayer';

    call(inputs) {
      if (Array.isArray(inputs) && inputs.length > 0) {
        return inputs[0];
      }
      return inputs;
    }
  }

  registerFn(CTCLossLayer);
  customLayerRegistered = true;
};

const normalizeWeightName = (name) => {
  if (typeof name !== 'string') {
    return name;
  }

  if (name.startsWith('forward_lstm/lstm_cell/')) {
    return name.replace('forward_lstm/lstm_cell/', 'bidirectional/forward_forward_lstm/');
  }

  if (name.startsWith('backward_lstm/lstm_cell/')) {
    return name.replace('backward_lstm/lstm_cell/', 'bidirectional/backward_forward_lstm/');
  }

  if (name.startsWith('forward_lstm/')) {
    return name.replace('forward_lstm/', 'bidirectional/forward_forward_lstm/');
  }

  if (name.startsWith('backward_lstm/')) {
    return name.replace('backward_lstm/', 'bidirectional/backward_forward_lstm/');
  }

  return name;
};

const resolveSharp = async() => {
  if (sharpModulePromise) {
    return sharpModulePromise;
  }

  const attempts = [
    () => {
      try {
        return requireFromBackend('sharp');
      } catch {
        return null;
      }
    },
    () => {
      try {
        return requireFromRoot('sharp');
      } catch {
        return null;
      }
    },
    async() => {
      try {
        const module = await import('sharp');
        return module.default || module;
      } catch {
        return null;
      }
    }
  ];

  sharpModulePromise = (async() => {
    for (const loader of attempts) {
      const result = await loader();
      if (result) {
        return result;
      }
    }
    console.warn('[prescription-handwriting] Sharp image loader unavailable');
    return null;
  })();

  return sharpModulePromise;
};

const ensureFileFetchSupport = () => {
  if (fileFetchPatched || typeof globalThis.fetch !== 'function') {
    return;
  }

  const ResponseCtor = globalThis.Response;
  if (typeof ResponseCtor !== 'function') {
    return;
  }

  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async(resource, init) => {
    const url = typeof resource === 'string' ? resource : resource?.url;
    if (typeof url === 'string' && url.startsWith('file://')) {
      try {
        const filePath = fileURLToPath(url);
        let data = await fs.readFile(filePath);
        if (filePath.endsWith('model.json')) {
          try {
            const parsed = JSON.parse(data.toString('utf8'));
            const pruned = pruneModelForInference(parsed);
            data = Buffer.from(JSON.stringify(pruned));
          } catch (parseError) {
            console.warn('[prescription-handwriting] Failed to prepare model.json for fetch load', parseError.message);
          }
        }

        return new ResponseCtor(data, { status: 200 });
      } catch (error) {
        return new ResponseCtor(null, { status: 404, statusText: error.message });
      }
    }

    return originalFetch(resource, init);
  };

  fileFetchPatched = true;
};

const pruneModelForInference = (modelJson) => {
  try {
    const topology = modelJson?.modelTopology;
    const modelConfig = topology?.model_config?.config;
    if (!modelConfig?.layers) {
      return modelJson;
    }

    const removable = new Set(['label', 'label_length', 'ctc_loss']);
    modelConfig.layers = modelConfig.layers
      .map(layer => {
        if (layer?.class_name === 'InputLayer' && layer.config) {
          const batchShape = layer.config.batch_input_shape
            || layer.config.batchInputShape
            || layer.config.batch_shape
            || layer.config.batchShape;
          if (batchShape && !layer.config.batch_input_shape) {
            layer.config.batch_input_shape = batchShape;
          }
          if (batchShape && !layer.config.batchInputShape) {
            layer.config.batchInputShape = batchShape;
          }
          if (!layer.config.dtype && layer.config.batch_input_shape) {
            layer.config.dtype = 'float32';
          }
        }

        if (Array.isArray(layer?.inbound_nodes) && layer.inbound_nodes.length > 0) {
          const firstNode = layer.inbound_nodes[0];
          if (!Array.isArray(firstNode)) {
            const converted = [];
            for (const node of layer.inbound_nodes) {
              if (Array.isArray(node)) {
                converted.push(node);
                continue;
              }

              const args = Array.isArray(node?.args) ? node.args : [];
              const entries = args
                .map(arg => {
                  const history = arg?.config?.keras_history;
                  if (Array.isArray(history) && history.length >= 3) {
                    return [history[0], history[1], history[2], node?.kwargs ?? {}];
                  }
                  return null;
                })
                .filter(Boolean);

              if (entries.length) {
                converted.push(entries);
              }
            }

            layer.inbound_nodes = converted;
          }
        }

        return layer;
      })
      .filter(layer => !removable.has(layer?.name));

    if (Array.isArray(modelConfig.input_layers)) {
      modelConfig.input_layers = modelConfig.input_layers.filter(([name]) => name === 'image');
    }

    const hasCharProbs = modelConfig.layers.some(layer => layer?.name === 'char_probs');
    if (hasCharProbs) {
      modelConfig.output_layers = [['char_probs', 0, 0]];
    }

    if (modelJson.training_config) {
      delete modelJson.training_config;
    }

    if (modelJson.modelInitializer) {
      delete modelJson.modelInitializer;
    }

    if (modelJson.initializerSignature) {
      delete modelJson.initializerSignature;
    }

    if (modelJson.signature) {
      delete modelJson.signature;
    }

    if (modelJson.inputSignature) {
      delete modelJson.inputSignature;
    }

    if (Array.isArray(modelJson.weightsManifest)) {
      for (const group of modelJson.weightsManifest) {
        if (!Array.isArray(group?.weights)) {
          continue;
        }

        for (const weight of group.weights) {
          if (typeof weight?.name === 'string') {
            weight.name = normalizeWeightName(weight.name);
          }
        }
      }
    }
  } catch (error) {
    console.warn('[prescription-handwriting] Failed to prune model topology for inference', error.message);
  }

  return modelJson;
};

const buildSymbolTable = (numClasses) => {
  if (symbolTableCache && symbolTableSize === numClasses) {
    return symbolTableCache;
  }

  const roster = [];
  const pushChars = (source) => {
    for (const ch of source) {
      if (!roster.includes(ch)) {
        roster.push(ch);
      }
    }
  };

  pushChars(BASE_CHARACTERS);
  pushChars(FALLBACK_CHARACTERS);

  while (roster.length < Math.max(numClasses - 1, 0)) {
    roster.push('?');
  }

  const usable = roster.slice(0, Math.max(numClasses - 1, 0));
  const table = usable.concat(['']);
  symbolTableCache = table;
  symbolTableSize = numClasses;
  return symbolTableCache;
};

const decodeSequence = (logits, symbols) => {
  const blankIndex = symbols.length > 0 ? symbols.length - 1 : 0;
  let lastIndex = blankIndex;
  let decoded = '';
  const confidences = [];
  const debug = process.env.PRESCRIPTION_DEBUG === '1' || process.env.PRESCRIPTION_DEBUG === 'indexes';
  const indexTrace = debug ? [] : null;
  const emitted = debug ? [] : null;

  for (const timestep of logits) {
    let maxIndex = 0;
    let maxValue = Number.NEGATIVE_INFINITY;
    for (let idx = 0; idx < timestep.length; idx += 1) {
      const value = timestep[idx];
      if (value > maxValue) {
        maxValue = value;
        maxIndex = idx;
      }
    }

    if (indexTrace) {
      indexTrace.push(maxIndex);
    }

    if (maxIndex !== blankIndex && maxIndex !== lastIndex) {
      const symbol = symbols[maxIndex] ?? '?';
      decoded += symbol;
      confidences.push(Number(maxValue.toFixed(3)));
      if (emitted) {
        emitted.push(`${maxIndex}:${symbol}:${maxValue.toFixed(3)}`);
      }
    }

    lastIndex = maxIndex;
  }

  const confidence = confidences.length
    ? Number((confidences.reduce((acc, value) => acc + value, 0) / confidences.length).toFixed(3))
    : 0;

  if (indexTrace) {
    console.info('[prescription-handwriting] Greedy index trace', indexTrace.join(','));
  }

  if (emitted) {
    console.info('[prescription-handwriting] Emitted sequence', emitted.join(' '));
  }

  return {
    text: decoded.trim(),
    confidence,
    charConfidences: confidences
  };
};

const resolveTensorFlow = async() => {
  if (tensorflowModuleCache) {
    return tensorflowModuleCache;
  }

  // Suppress TensorFlow kernel registration warnings
  const originalWarn = console.warn;
  const originalLog = console.log;
  console.warn = (...args) => {
    const msg = args.join(' ');
    if (!msg.includes('already registered') && !msg.includes('Overwriting the platform')) {
      originalWarn.apply(console, args);
    }
  };
  console.log = (...args) => {
    const msg = args.join(' ');
    if (!msg.includes('already registered') && !msg.includes('Platform node has already been set')) {
      originalLog.apply(console, args);
    }
  };

  const attempts = [
    {
      label: '@tensorflow/tfjs-node (backend)',
      loader: () => {
      try {
        return requireFromBackend('@tensorflow/tfjs-node');
      } catch (error) {
        return null;
      }
      }
    },
    {
      label: '@tensorflow/tfjs-node (root)',
      loader: () => {
      try {
        return requireFromRoot('@tensorflow/tfjs-node');
      } catch (error) {
        return null;
      }
      }
    },
    {
      label: '@tensorflow/tfjs-node (dynamic)',
      loader: async() => {
      try {
        const module = await import('@tensorflow/tfjs-node');
        return module;
      } catch (error) {
        return null;
      }
      }
    },
    {
      label: '@tensorflow/tfjs (backend)',
      loader: () => {
      try {
        return requireFromBackend('@tensorflow/tfjs');
      } catch (error) {
        return null;
      }
      }
    },
    {
      label: '@tensorflow/tfjs (root)',
      loader: () => {
      try {
        return requireFromRoot('@tensorflow/tfjs');
      } catch (error) {
        return null;
      }
      }
    },
    {
      label: '@tensorflow/tfjs (dynamic)',
      loader: async() => {
      try {
        const module = await import('@tensorflow/tfjs');
        return module;
      } catch (error) {
        return null;
      }
      }
    }
  ];

  for (const attempt of attempts) {
    const result = await attempt.loader();
    if (result) {
      tensorflowModuleCache = result.default || result;
      runtimeTag = attempt.label;
      if (!runtimeLogged && runtimeTag) {
        console.info(`[prescription-handwriting] TensorFlow runtime: ${runtimeTag}`);
        runtimeLogged = true;
      }
      
      // Restore console methods
      console.warn = originalWarn;
      console.log = originalLog;
      
      return tensorflowModuleCache;
    }
  }

  // Restore console methods even if loading fails
  console.warn = originalWarn;
  console.log = originalLog;

  return null;
};

const loadEnvironment = async() => {
  if (modelEnvironmentPromise) {
    return modelEnvironmentPromise;
  }

  modelEnvironmentPromise = (async() => {
    const tf = await resolveTensorFlow();
    if (!tf) {
      console.warn('[prescription-handwriting] TensorFlow runtime unavailable');
      return null;
    }

    if (!tf?.loadLayersModel) {
      console.warn('[prescription-handwriting] TensorFlow runtime missing loadLayersModel');
      return null;
    }

    registerCustomObjects(tf);

    const modelPath = path.join(__dirname, 'model.json');
    try {
      await fs.access(modelPath);
    } catch {
      console.warn('[prescription-handwriting] model.json not found at', modelPath);
      return null;
    }

    let baseModel;
    if (tf.io?.fileSystem) {
      const ioHandler = tf.io.fileSystem(modelPath);
      baseModel = await tf.loadLayersModel(ioHandler);
    } else {
      ensureFileFetchSupport();
      try {
        baseModel = await tf.loadLayersModel(pathToFileURL(modelPath).href);
      } catch (loadError) {
        console.warn('[prescription-handwriting] loadLayersModel via fetch failed, attempting manual load', { error: loadError.message });

        const rawModel = await fs.readFile(modelPath, 'utf8');
        const parsedModel = JSON.parse(rawModel);
        const prunedModel = pruneModelForInference(parsedModel);
        const manifest = prunedModel.weightsManifest || [];
        const weightSpecs = [];
        const weightBuffers = [];

        for (const group of manifest) {
          if (Array.isArray(group.weights)) {
            weightSpecs.push(...group.weights);
          }

          for (const relativePath of group.paths || []) {
            const absolutePath = path.join(__dirname, relativePath);
            try {
              const buffer = await fs.readFile(absolutePath);
              weightBuffers.push(buffer);
            } catch (error) {
              console.warn('[prescription-handwriting] Failed to read weight shard', { path: absolutePath, error: error.message });
              return null;
            }
          }
        }

        const combinedWeights = weightBuffers.length ? Buffer.concat(weightBuffers) : Buffer.alloc(0);
        const arrayBuffer = combinedWeights.buffer.slice(
          combinedWeights.byteOffset,
          combinedWeights.byteOffset + combinedWeights.byteLength
        );

        const artifacts = {
          modelTopology: prunedModel.modelTopology,
          weightSpecs,
          weightData: arrayBuffer,
          format: prunedModel.format,
          generatedBy: prunedModel.generatedBy,
          convertedBy: prunedModel.convertedBy,
          trainingConfig: prunedModel.training_config,
          userDefinedMetadata: prunedModel.userDefinedMetadata,
          signature: prunedModel.signature,
          modelInitializer: prunedModel.modelInitializer,
          initializerSignature: prunedModel.initializerSignature,
          inputSignature: prunedModel.inputSignature
        };

        baseModel = await tf.loadLayersModel(tf.io.fromMemory(artifacts));
      }
    }
    const imageInput = baseModel.inputs.find(input => input.name === 'image') ?? baseModel.inputs[0];
    const charLayer = baseModel.getLayer('char_probs');

    const inferenceModel = tf.model({ inputs: imageInput, outputs: charLayer.output });

    return { tf, baseModel, inferenceModel };
  })();

  return modelEnvironmentPromise;
};

const shouldInvertPixels = async(normalizedTensor, sampleStats) => {
  const invertFlag = process.env.PRESCRIPTION_INVERT;
  if (invertFlag === '1') {
    return true;
  }

  if (invertFlag === '0') {
    return false;
  }

  if (normalizedTensor?.mean) {
    const meanTensor = normalizedTensor.mean();
    const [meanValue] = await meanTensor.data();
    meanTensor.dispose();
    if (Number.isFinite(meanValue)) {
      return meanValue > 0.6;
    }
  }

  if (Array.isArray(sampleStats) && sampleStats.length === 2) {
    const [sum, count] = sampleStats;
    if (count > 0) {
      const average = sum / count;
      return average > 0.6;
    }
  }

  return false;
};

const preprocessImage = async(imagePath, tf) => {
  const absolutePath = path.isAbsolute(imagePath)
    ? imagePath
    : path.resolve(process.cwd(), imagePath);

  if (tf?.node?.decodeImage) {
    const buffer = await fs.readFile(absolutePath);
    const decoded = tf.node.decodeImage(buffer, 1);
    const resized = tf.image.resizeBilinear(decoded, [64, 200], true);
    let normalized = resized.toFloat().div(255);
    const invertPixels = await shouldInvertPixels(normalized, null);
    if (invertPixels) {
      const inverted = tf.sub(1, normalized);
      normalized.dispose();
      normalized = inverted;
    }
    const expanded = normalized.expandDims(0);

    decoded.dispose();
    resized.dispose();
    normalized.dispose();

    return expanded;
  }

  const sharp = await resolveSharp();
  if (!sharp) {
    console.warn('[prescription-handwriting] No image preprocessing backend available');
    return null;
  }

  const { data, info } = await sharp(absolutePath)
    .greyscale()
    .resize(200, 64, { fit: 'fill', fastShrinkOnLoad: true })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const floatData = new Float32Array(data.length);
  let sum = 0;
  for (let idx = 0; idx < data.length; idx += 1) {
    const value = data[idx] / 255;
    floatData[idx] = value;
    sum += value;
  }

  const invertPixels = await shouldInvertPixels(null, [sum, floatData.length]);
  if (invertPixels) {
    for (let idx = 0; idx < floatData.length; idx += 1) {
      floatData[idx] = 1 - floatData[idx];
    }
  }

  const base = tf.tensor(floatData, [info.height, info.width, 1]);
  const expanded = base.expandDims(0);
  base.dispose();

  return expanded;
};

export default async function inferHandwriting(imagePath) {
  try {
    const environment = await loadEnvironment();
    if (!environment) {
      return { text: '', confidence: 0, charConfidences: [] };
    }

    const { tf, inferenceModel } = environment;
    const inputTensor = await preprocessImage(imagePath, tf);
    if (!inputTensor) {
      return { text: '', confidence: 0, charConfidences: [] };
    }

    const predictionTensor = inferenceModel.predict(inputTensor);
    const logits = await predictionTensor.array();
    predictionTensor.dispose();
    inputTensor.dispose();

    const [sequence] = logits;
    if (!sequence || !sequence.length || !sequence[0]?.length) {
      return { text: '', confidence: 0, charConfidences: [] };
    }

    const symbols = buildSymbolTable(sequence[0].length);
    const decoded = decodeSequence(sequence, symbols);

    return decoded;
  } catch (error) {
    console.warn('[prescription-handwriting] Inference failed', error);
    return { text: '', confidence: 0, charConfidences: [] };
  }
}