import { Injectable, signal, computed } from '@angular/core';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgpu';
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm';
import { GraphService } from './graph.service';
import { getLayerTypeDef } from '../models/layer-types';
import { GraphNode, Edge } from '../models/graph.model';

export type TfjsBackend = 'webgpu' | 'webgl' | 'wasm' | 'cpu';
export type BackendStatus = 'initializing' | 'ready' | 'fallback' | 'error';

export interface BackendOption {
  id: TfjsBackend;
  label: string;
  description: string;
}

export interface TrainingConfig {
  epochs: number;
  batchSize: number;
  learningRate: number;
  validationSplit: number;
  optimizer: 'adam' | 'sgd' | 'rmsprop';
  loss: string;
  metrics: string[];
}

export interface TrainingMetrics {
  epoch: number;
  loss: number;
  valLoss: number | null;
  accuracy: number | null;
  valAccuracy: number | null;
}

export interface TrainingData {
  x: number[][];
  y: number[][];
}

export interface TrainingShapeInfo {
  inputShape: number[];
  inputSize: number;
  outputSize: number;
}

const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  epochs: 50,
  batchSize: 32,
  learningRate: 0.001,
  validationSplit: 0.2,
  optimizer: 'adam',
  loss: 'categoricalCrossentropy',
  metrics: ['accuracy'],
};

const BACKEND_OPTIONS: BackendOption[] = [
  {
    id: 'webgpu',
    label: 'WebGPU',
    description: 'GPU moderna, mejor para modelos medianos/grandes.',
  },
  { id: 'webgl', label: 'WebGL', description: 'GPU compatible con la mayoria de navegadores.' },
  { id: 'wasm', label: 'WASM', description: 'CPU optimizada en WebAssembly.' },
  { id: 'cpu', label: 'CPU', description: 'Fallback universal, mas lento pero estable.' },
];

const BACKEND_FALLBACKS: Record<TfjsBackend, TfjsBackend[]> = {
  webgpu: ['webgpu', 'webgl', 'wasm', 'cpu'],
  webgl: ['webgl', 'wasm', 'cpu'],
  wasm: ['wasm', 'cpu'],
  cpu: ['cpu'],
};

@Injectable({ providedIn: 'root' })
export class TfjsService {
  readonly backendOptions = BACKEND_OPTIONS;

  private _preferredBackend = signal<TfjsBackend>('webgpu');
  private _activeBackend = signal<string>(tf.getBackend());
  private _backendStatus = signal<BackendStatus>('initializing');
  private _backendMessage = signal('Initializing WebGPU backend...');
  private _backendError = signal<string | null>(null);
  private _backendSwitching = signal(false);
  private _training = signal(false);
  private _trainingMetrics = signal<TrainingMetrics[]>([]);
  private _currentEpoch = signal(0);
  private _modelErrors = signal<string[]>([]);
  private _model: tf.LayersModel | null = null;
  private _trainingAbortController: AbortController | null = null;
  private backendRequestId = 0;

  preferredBackend = computed(() => this._preferredBackend());
  activeBackend = computed(() => this._activeBackend());
  backendStatus = computed(() => this._backendStatus());
  backendMessage = computed(() => this._backendMessage());
  backendError = computed(() => this._backendError());
  backendSwitching = computed(() => this._backendSwitching());
  webgpuReady = computed(() => this._activeBackend() === 'webgpu');
  training = computed(() => this._training());
  trainingMetrics = computed(() => this._trainingMetrics());
  currentEpoch = computed(() => this._currentEpoch());
  modelErrors = computed(() => this._modelErrors());

  constructor(private graphService: GraphService) {
    this.configureWasmBackend();
    void this.setBackendPreference('webgpu');
  }

  private configureWasmBackend() {
    setWasmPaths('/assets/tfjs-backend-wasm/');
  }

  async setBackendPreference(preferredBackend: TfjsBackend): Promise<void> {
    if (this._training()) {
      throw new Error('Cannot change backend while training is running.');
    }

    const requestId = ++this.backendRequestId;
    this._preferredBackend.set(preferredBackend);
    this._backendSwitching.set(true);
    this._backendStatus.set('initializing');
    this._backendMessage.set(`Initializing ${this.getBackendLabel(preferredBackend)} backend...`);
    this._backendError.set(null);

    const failures: string[] = [];

    for (const backend of BACKEND_FALLBACKS[preferredBackend]) {
      try {
        await tf.setBackend(backend);
        await tf.ready();

        if (requestId !== this.backendRequestId) return;

        this._activeBackend.set(tf.getBackend());
        this._backendStatus.set(backend === preferredBackend ? 'ready' : 'fallback');
        this._backendMessage.set(
          backend === preferredBackend
            ? `${this.getBackendLabel(backend)} backend active.`
            : `${this.getBackendLabel(preferredBackend)} is unavailable. Using ${this.getBackendLabel(backend)} fallback.`,
        );
        this._backendError.set(failures.length ? failures.join(' ') : null);
        this._backendSwitching.set(false);
        console.log(`${this.getBackendLabel(backend)} backend initialized`);
        return;
      } catch (error) {
        failures.push(`${this.getBackendLabel(backend)}: ${(error as Error).message}`);
      }
    }

    if (requestId === this.backendRequestId) {
      this._backendStatus.set('error');
      this._backendMessage.set('No TensorFlow.js backend could be initialized.');
      this._backendError.set(failures.join(' '));
      this._backendSwitching.set(false);
    }
  }

  private getBackendLabel(backend: string): string {
    return BACKEND_OPTIONS.find((option) => option.id === backend)?.label ?? backend.toUpperCase();
  }

  async retryBackend(): Promise<void> {
    await this.setBackendPreference(this._preferredBackend());
  }

  isBackendAvailable(backend: TfjsBackend): boolean {
    return tf.findBackend(backend) != null;
  }

  getBackendOption(backend: TfjsBackend): BackendOption {
    return BACKEND_OPTIONS.find((option) => option.id === backend) ?? BACKEND_OPTIONS[0];
  }

  getBackend(): string {
    return this._activeBackend();
  }

  getTrainingShapeInfo(): TrainingShapeInfo {
    const nodes = this.graphService.nodes();
    const edges = this.graphService.edges();
    const inputNode = nodes.find((node) => node.type === 'input');
    const outputNode = this.findOutputNodes(nodes, edges)[0];
    const inputShape = this.normalizeShape(inputNode?.params['shape'] ?? [4]);

    return {
      inputShape,
      inputSize: this.product(inputShape),
      outputSize: Number(outputNode?.params['units']) || 1,
    };
  }

  buildModelFromGraph(): tf.LayersModel | null {
    const nodes = this.graphService.nodes();
    const edges = this.graphService.edges();
    const validationErrors = this.validateGraph(nodes, edges);

    if (validationErrors.length) {
      this._modelErrors.set(validationErrors);
      return null;
    }

    if (nodes.length === 0) {
      this._modelErrors.set(['Add at least one input layer and one trainable/output layer.']);
      return null;
    }

    const inputNodes = nodes.filter((n) => n.type === 'input');
    if (inputNodes.length === 0) {
      this._modelErrors.set(['Add an Input node before building the model.']);
      return null;
    }

    const outputNodes = this.findOutputNodes(nodes, edges);
    if (outputNodes.length === 0) {
      this._modelErrors.set(['Connect the graph so at least one non-input layer is an output.']);
      return null;
    }

    try {
      const sortedNodes = this.topologicalSort(nodes, edges);
      const nodeToLayer = new Map<string, tf.SymbolicTensor>();

      for (const node of sortedNodes) {
        const def = getLayerTypeDef(node.type);
        if (!def) continue;

        const incomingEdges = edges.filter((e) => e.targetNodeId === node.id);
        const sourceTensors = incomingEdges
          .map((e) => nodeToLayer.get(e.sourceNodeId))
          .filter((t): t is tf.SymbolicTensor => t !== undefined);

        let layer: tf.layers.Layer;
        let outputTensor: tf.SymbolicTensor;

        if (node.type === 'input') {
          const shape = node.params.shape || [10];
          const inputLayer = tf.input({ shape, name: node.id });
          outputTensor = inputLayer as tf.SymbolicTensor;
        } else if (node.type === 'concatenate') {
          if (sourceTensors.length === 0) continue;
          const axis = node.params.axis || -1;
          layer = tf.layers.concatenate({ axis });
          outputTensor = layer.apply(sourceTensors) as tf.SymbolicTensor;
        } else {
          if (sourceTensors.length !== 1) continue;
          const inputTensor = sourceTensors[0];

          switch (node.type) {
            case 'dense':
              layer = tf.layers.dense({
                units: node.params.units || 64,
                activation: node.params.activation || 'relu',
                useBias: node.params.useBias !== false,
                name: node.id,
              });
              break;
            case 'conv2d':
              layer = tf.layers.conv2d({
                filters: node.params.filters || 32,
                kernelSize: node.params.kernelSize || 3,
                strides: node.params.strides || 1,
                padding: node.params.padding || 'valid',
                activation: node.params.activation || 'relu',
                name: node.id,
              });
              break;
            case 'conv1d':
              layer = tf.layers.conv1d({
                filters: node.params.filters || 32,
                kernelSize: node.params.kernelSize || 3,
                strides: node.params.strides || 1,
                padding: node.params.padding || 'valid',
                activation: node.params.activation || 'relu',
                name: node.id,
              });
              break;
            case 'lstm':
              layer = tf.layers.lstm({
                units: node.params.units || 32,
                activation: node.params.activation || 'tanh',
                recurrentActivation: node.params.recurrentActivation || 'sigmoid',
                returnSequences: node.params.returnSequences || false,
                name: node.id,
              });
              break;
            case 'gru':
              layer = tf.layers.gru({
                units: node.params.units || 32,
                activation: node.params.activation || 'tanh',
                recurrentActivation: node.params.recurrentActivation || 'sigmoid',
                returnSequences: node.params.returnSequences || false,
                name: node.id,
              });
              break;
            case 'simple_rnn':
              layer = tf.layers.simpleRNN({
                units: node.params.units || 32,
                activation: node.params.activation || 'tanh',
                returnSequences: node.params.returnSequences || false,
                name: node.id,
              });
              break;
            case 'flatten':
              layer = tf.layers.flatten({ name: node.id });
              break;
            case 'dropout':
              layer = tf.layers.dropout({ rate: node.params.rate || 0.5, name: node.id });
              break;
            case 'batch_norm':
              layer = tf.layers.batchNormalization({ name: node.id });
              break;
            case 'max_pool_2d':
              layer = tf.layers.maxPooling2d({
                poolSize: node.params.poolSize || 2,
                strides: node.params.strides || 2,
                padding: node.params.padding || 'valid',
                name: node.id,
              });
              break;
            case 'avg_pool_2d':
              layer = tf.layers.averagePooling2d({
                poolSize: node.params.poolSize || 2,
                strides: node.params.strides || 2,
                padding: node.params.padding || 'valid',
                name: node.id,
              });
              break;
            case 'reshape':
              layer = tf.layers.reshape({
                targetShape: node.params.targetShape || [10],
                name: node.id,
              });
              break;
            case 'embedding':
              layer = tf.layers.embedding({
                inputDim: node.params.inputDim || 100,
                outputDim: node.params.outputDim || 16,
                name: node.id,
              });
              break;
            case 'global_avg_pool_2d':
              layer = tf.layers.globalAveragePooling2d({ name: node.id });
              break;
            case 'global_max_pool_2d':
              layer = tf.layers.globalMaxPooling2d({ name: node.id });
              break;
            default:
              console.warn(`Unsupported layer type: ${node.type}`);
              continue;
          }

          outputTensor = layer.apply(inputTensor) as tf.SymbolicTensor;
        }

        nodeToLayer.set(node.id, outputTensor);
      }

      const inputTensors = inputNodes
        .map((n) => nodeToLayer.get(n.id))
        .filter((t): t is tf.SymbolicTensor => t !== undefined);

      const outputTensors = outputNodes
        .map((n) => nodeToLayer.get(n.id))
        .filter((t): t is tf.SymbolicTensor => t !== undefined);

      if (inputTensors.length === 0 || outputTensors.length === 0) {
        this._modelErrors.set(['Could not resolve valid input/output tensors from the graph.']);
        return null;
      }

      const model = tf.model({
        inputs: inputTensors,
        outputs: outputTensors,
      });

      this._model = model;
      this._modelErrors.set([]);
      return model;
    } catch (e) {
      this._modelErrors.set([`Failed to build model: ${(e as Error).message}`]);
      return null;
    }
  }

  validateGraph(nodes = this.graphService.nodes(), edges = this.graphService.edges()): string[] {
    const errors: string[] = [];

    if (nodes.length === 0) {
      return ['Add at least one input layer and one trainable/output layer.'];
    }

    const inputNodes = nodes.filter((node) => node.type === 'input');
    if (inputNodes.length === 0) {
      errors.push('Add an Input node before building the model.');
    }

    for (const inputNode of inputNodes) {
      const shape = inputNode.params['shape'];
      if (
        !Array.isArray(shape) ||
        shape.length === 0 ||
        shape.some((value) => !Number.isFinite(value) || value <= 0)
      ) {
        errors.push(`${inputNode.label} requires a valid positive shape, e.g. 4 or 28,28,1.`);
      }
    }

    const outputNodes = this.findOutputNodes(nodes, edges);
    if (outputNodes.length === 0) {
      errors.push('Connect the graph so at least one non-input layer is an output.');
    }

    for (const node of nodes) {
      if (node.type === 'input') continue;

      const incoming = edges.filter((edge) => edge.targetNodeId === node.id);
      if (incoming.length === 0) {
        errors.push(`${node.label} is missing an input connection.`);
      }

      const connectedTargetPorts = new Set(incoming.map((edge) => edge.targetPortId));
      for (const port of node.inputPorts) {
        if (!connectedTargetPorts.has(port.id)) {
          errors.push(`${node.label} input "${port.label}" is not connected.`);
        }
      }
    }

    if (this.topologicalSort(nodes, edges).length !== nodes.length) {
      errors.push('The graph contains a cycle. Neural network graphs must be acyclic.');
    }

    return errors;
  }

  private findOutputNodes(nodes: GraphNode[], edges: Edge[]): GraphNode[] {
    const hasOutgoing = new Set(edges.map((e) => e.sourceNodeId));
    return nodes.filter((n) => !hasOutgoing.has(n.id) && n.type !== 'input');
  }

  private topologicalSort(nodes: GraphNode[], edges: Edge[]): GraphNode[] {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    for (const node of nodes) {
      inDegree.set(node.id, 0);
      adjList.set(node.id, []);
    }

    for (const edge of edges) {
      const sources = adjList.get(edge.sourceNodeId) || [];
      sources.push(edge.targetNodeId);
      adjList.set(edge.sourceNodeId, sources);
      inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) || 0) + 1);
    }

    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) queue.push(nodeId);
    }

    const result: GraphNode[] = [];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = nodeMap.get(nodeId);
      if (node) result.push(node);

      for (const neighbor of adjList.get(nodeId) || []) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }

    return result;
  }

  getModel(): tf.LayersModel | null {
    return this._model;
  }

  getModelSummary(): string {
    if (!this._model) return 'No model built';
    const lines: string[] = [];
    this._model.summary(undefined, undefined, (line: string) => lines.push(line));
    return lines.join('\n');
  }

  async train(
    trainingData: TrainingData,
    config: Partial<TrainingConfig> = {},
  ): Promise<TrainingMetrics[]> {
    const model = this.buildModelFromGraph();
    if (!model) throw new Error('Failed to build model');

    const fullConfig = { ...DEFAULT_TRAINING_CONFIG, ...config };

    const optimizer = this.createOptimizer(fullConfig.optimizer, fullConfig.learningRate);

    model.compile({
      optimizer,
      loss: fullConfig.loss,
      metrics: fullConfig.metrics,
    });

    if (model.inputs.length !== 1 || model.outputs.length !== 1) {
      throw new Error('Training currently supports one input tensor and one output tensor.');
    }

    const { x, y } = trainingData;
    const shapeInfo = this.getTrainingShapeInfo();
    this.validateTrainingDataRows(x, shapeInfo.inputSize, 'input');
    this.validateTrainingDataRows(y, y[0]?.length || 1, 'output');

    const xs = tf.tensor(x.flat(), [x.length, ...shapeInfo.inputShape]);
    const ys = tf.tensor2d(y, [y.length, y[0].length]);

    this._training.set(true);
    this._trainingMetrics.set([]);
    this._currentEpoch.set(0);
    this._trainingAbortController = new AbortController();

    try {
      await model.fit(xs, ys, {
        epochs: fullConfig.epochs,
        batchSize: fullConfig.batchSize,
        validationSplit: fullConfig.validationSplit,
        shuffle: true,
        callbacks: {
          onEpochBegin: (epoch) => {
            this._currentEpoch.set(epoch + 1);
          },
          onEpochEnd: (epoch, logs) => {
            this._trainingMetrics.update((prev) => [
              ...prev,
              {
                epoch: epoch + 1,
                loss: logs?.['loss'] || 0,
                valLoss: logs?.['val_loss'] || null,
                accuracy: logs?.['accuracy'] || logs?.['acc'] || null,
                valAccuracy: logs?.['val_accuracy'] || logs?.['val_acc'] || null,
              },
            ]);
          },
        },
      });

      return this._trainingMetrics();
    } finally {
      this._training.set(false);
      this._trainingAbortController = null;
      xs.dispose();
      ys.dispose();
    }
  }

  stopTraining() {
    if (this._trainingAbortController) {
      this._trainingAbortController.abort();
    }
  }

  private createOptimizer(name: string, learningRate: number): tf.Optimizer {
    switch (name) {
      case 'adam':
        return tf.train.adam(learningRate);
      case 'sgd':
        return tf.train.sgd(learningRate);
      case 'rmsprop':
        return tf.train.rmsprop(learningRate);
      default:
        return tf.train.adam(learningRate);
    }
  }

  predict(inputData: number[][]): number[][] {
    if (!this._model) throw new Error('No model available');
    const shapeInfo = this.getTrainingShapeInfo();
    this.validateTrainingDataRows(inputData, shapeInfo.inputSize, 'prediction input');
    const tensor = tf.tensor(inputData.flat(), [inputData.length, ...shapeInfo.inputShape]);
    const prediction = this._model.predict(tensor) as tf.Tensor;
    const result = prediction.arraySync() as number[][];
    tensor.dispose();
    prediction.dispose();
    return result;
  }

  async predictAsync(inputData: number[][]): Promise<number[][]> {
    if (!this._model) throw new Error('No model available');
    const shapeInfo = this.getTrainingShapeInfo();
    this.validateTrainingDataRows(inputData, shapeInfo.inputSize, 'prediction input');
    const tensor = tf.tensor(inputData.flat(), [inputData.length, ...shapeInfo.inputShape]);
    const prediction = this._model.predict(tensor) as tf.Tensor;
    try {
      const result = (await prediction.array()) as number[][];
      return result;
    } finally {
      tensor.dispose();
      prediction.dispose();
    }
  }

  saveModel(): string | null {
    if (!this._model) return null;
    return JSON.stringify(this._model.toJSON(), null, 2);
  }

  generateModelCode(): string {
    const nodes = this.graphService.nodes();
    const edges = this.graphService.edges();
    const errors = this.validateGraph(nodes, edges);

    if (errors.length) {
      return `// Fix graph validation errors before exporting model code:\n${errors.map((error) => `// - ${error}`).join('\n')}`;
    }

    const sortedNodes = this.topologicalSort(nodes, edges);
    const outputNodes = this.findOutputNodes(nodes, edges);
    const varByNodeId = new Map<string, string>();
    const lines: string[] = [
      "import * as tf from '@tensorflow/tfjs';",
      "import '@tensorflow/tfjs-backend-webgpu';",
      "import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm';",
      '',
      "type TfjsBackend = 'webgpu' | 'webgl' | 'wasm' | 'cpu';",
      '',
      'const FALLBACKS: Record<TfjsBackend, TfjsBackend[]> = {',
      "  webgpu: ['webgpu', 'webgl', 'wasm', 'cpu'],",
      "  webgl: ['webgl', 'wasm', 'cpu'],",
      "  wasm: ['wasm', 'cpu'],",
      "  cpu: ['cpu'],",
      '};',
      '',
      'async function setPreferredBackend(preferredBackend: TfjsBackend) {',
      "  setWasmPaths('/assets/tfjs-backend-wasm/');",
      '  for (const backend of FALLBACKS[preferredBackend]) {',
      '    try {',
      '      await tf.setBackend(backend);',
      '      await tf.ready();',
      '      return backend;',
      '    } catch {',
      '      continue;',
      '    }',
      '  }',
      "  throw new Error('No TensorFlow.js backend could be initialized.');",
      '}',
      '',
      "export async function createModel(preferredBackend: TfjsBackend = 'webgpu') {",
      '  await setPreferredBackend(preferredBackend);',
      '',
    ];

    for (const node of sortedNodes) {
      const varName = this.toVariableName(node.label, varByNodeId.size);
      varByNodeId.set(node.id, varName);

      if (node.type === 'input') {
        lines.push(
          `  const ${varName} = tf.input({ shape: ${JSON.stringify(this.normalizeShape(node.params['shape']))} });`,
        );
        continue;
      }

      const incoming = edges.filter((edge) => edge.targetNodeId === node.id);
      const sourceVars = incoming
        .map((edge) => varByNodeId.get(edge.sourceNodeId))
        .filter(Boolean) as string[];
      const layerFactory = this.layerFactoryCode(node);

      if (node.type === 'concatenate') {
        lines.push(
          `  const ${varName} = ${layerFactory}.apply([${sourceVars.join(', ')}]) as tf.SymbolicTensor;`,
        );
      } else {
        lines.push(
          `  const ${varName} = ${layerFactory}.apply(${sourceVars[0]}) as tf.SymbolicTensor;`,
        );
      }
    }

    const inputs = nodes
      .filter((node) => node.type === 'input')
      .map((node) => varByNodeId.get(node.id))
      .filter(Boolean);
    const outputs = outputNodes.map((node) => varByNodeId.get(node.id)).filter(Boolean);
    lines.push(
      '',
      `  const model = tf.model({ inputs: [${inputs.join(', ')}], outputs: [${outputs.join(', ')}] });`,
      '  return model;',
      '}',
    );

    return lines.join('\n');
  }

  async loadModel(json: string): Promise<void> {
    this._model = await tf.models.modelFromJSON(JSON.parse(json));
  }

  private normalizeShape(shape: unknown): number[] {
    if (!Array.isArray(shape)) return [4];
    const normalized = shape
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);
    return normalized.length ? normalized : [4];
  }

  private layerFactoryCode(node: GraphNode): string {
    const params = node.params;
    switch (node.type) {
      case 'dense':
        return `tf.layers.dense({ units: ${params['units'] || 64}, activation: '${params['activation'] || 'relu'}', useBias: ${params['useBias'] !== false} })`;
      case 'conv2d':
        return `tf.layers.conv2d({ filters: ${params['filters'] || 32}, kernelSize: ${params['kernelSize'] || 3}, strides: ${params['strides'] || 1}, padding: '${params['padding'] || 'valid'}', activation: '${params['activation'] || 'relu'}' })`;
      case 'conv1d':
        return `tf.layers.conv1d({ filters: ${params['filters'] || 32}, kernelSize: ${params['kernelSize'] || 3}, strides: ${params['strides'] || 1}, padding: '${params['padding'] || 'valid'}', activation: '${params['activation'] || 'relu'}' })`;
      case 'lstm':
        return `tf.layers.lstm({ units: ${params['units'] || 32}, activation: '${params['activation'] || 'tanh'}', recurrentActivation: '${params['recurrentActivation'] || 'sigmoid'}', returnSequences: ${params['returnSequences'] || false} })`;
      case 'gru':
        return `tf.layers.gru({ units: ${params['units'] || 32}, activation: '${params['activation'] || 'tanh'}', recurrentActivation: '${params['recurrentActivation'] || 'sigmoid'}', returnSequences: ${params['returnSequences'] || false} })`;
      case 'simple_rnn':
        return `tf.layers.simpleRNN({ units: ${params['units'] || 32}, activation: '${params['activation'] || 'tanh'}', returnSequences: ${params['returnSequences'] || false} })`;
      case 'flatten':
        return 'tf.layers.flatten({})';
      case 'dropout':
        return `tf.layers.dropout({ rate: ${params['rate'] || 0.5} })`;
      case 'batch_norm':
        return 'tf.layers.batchNormalization({})';
      case 'max_pool_2d':
        return `tf.layers.maxPooling2d({ poolSize: ${params['poolSize'] || 2}, strides: ${params['strides'] || 2}, padding: '${params['padding'] || 'valid'}' })`;
      case 'avg_pool_2d':
        return `tf.layers.averagePooling2d({ poolSize: ${params['poolSize'] || 2}, strides: ${params['strides'] || 2}, padding: '${params['padding'] || 'valid'}' })`;
      case 'reshape':
        return `tf.layers.reshape({ targetShape: ${JSON.stringify(this.normalizeShape(params['targetShape']))} })`;
      case 'embedding':
        return `tf.layers.embedding({ inputDim: ${params['inputDim'] || 100}, outputDim: ${params['outputDim'] || 16} })`;
      case 'global_avg_pool_2d':
        return 'tf.layers.globalAveragePooling2d({})';
      case 'global_max_pool_2d':
        return 'tf.layers.globalMaxPooling2d({})';
      case 'concatenate':
        return `tf.layers.concatenate({ axis: ${params['axis'] || -1} })`;
      default:
        return 'tf.layers.dense({ units: 1 })';
    }
  }

  private toVariableName(label: string, index: number): string {
    const safe = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return `${safe || 'layer'}_${index}`;
  }

  private product(values: number[]): number {
    return values.reduce((acc, value) => acc * value, 1);
  }

  private validateTrainingDataRows(rows: number[][], expectedSize: number, label: string) {
    if (!rows.length) throw new Error(`No ${label} rows provided.`);
    const invalidRow = rows.findIndex((row) => row.length !== expectedSize);
    if (invalidRow >= 0) {
      throw new Error(
        `Invalid ${label} row ${invalidRow + 1}: expected ${expectedSize} values, got ${rows[invalidRow].length}.`,
      );
    }
  }

  disposeModel() {
    if (this._model) {
      this._model.dispose();
      this._model = null;
    }
  }
}
