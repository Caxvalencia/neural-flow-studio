import { GraphNodeType } from './graph.model';

export interface ParamDefinition {
  key: string;
  label: string;
  type: 'number' | 'select' | 'boolean' | 'string' | 'array';
  options?: { label: string; value: any }[];
  defaultValue: any;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

export interface LayerTypeDefinition {
  type: GraphNodeType;
  label: string;
  color: string;
  icon: string;
  description: string;
  inputs: number;
  outputs: number;
  defaultParams: Record<string, any>;
  paramDefinitions: ParamDefinition[];
}

const activations = ['relu', 'sigmoid', 'tanh', 'softmax', 'softplus', 'softsign', 'hardSigmoid', 'linear', 'elu', 'selu', 'gelu', 'mish', 'swish'];

const paddingOptions = ['valid', 'same', 'causal'];

export const LAYER_TYPES: LayerTypeDefinition[] = [
  {
    type: 'input',
    label: 'Input',
    color: '#4CAF50',
    icon: 'input',
    description: 'Input layer',
    inputs: 0,
    outputs: 1,
    defaultParams: { shape: [10] },
    paramDefinitions: [
      { key: 'shape', label: 'Shape', type: 'array', defaultValue: [10], placeholder: 'e.g. 28,28,1' },
    ],
  },
  {
    type: 'dense',
    label: 'Dense',
    color: '#2196F3',
    icon: 'join_inner',
    description: 'Fully connected layer',
    inputs: 1,
    outputs: 1,
    defaultParams: { units: 64, activation: 'relu', useBias: true },
    paramDefinitions: [
      { key: 'units', label: 'Units', type: 'number', defaultValue: 64, min: 1, max: 4096, step: 1 },
      { key: 'activation', label: 'Activation', type: 'select', defaultValue: 'relu', options: activations.map(a => ({ label: a, value: a })) },
      { key: 'useBias', label: 'Use Bias', type: 'boolean', defaultValue: true },
    ],
  },
  {
    type: 'conv2d',
    label: 'Conv2D',
    color: '#9C27B0',
    icon: 'grid_4x4',
    description: '2D Convolution layer',
    inputs: 1,
    outputs: 1,
    defaultParams: { filters: 32, kernelSize: 3, strides: 1, padding: 'valid', activation: 'relu' },
    paramDefinitions: [
      { key: 'filters', label: 'Filters', type: 'number', defaultValue: 32, min: 1, max: 1024, step: 1 },
      { key: 'kernelSize', label: 'Kernel Size', type: 'number', defaultValue: 3, min: 1, max: 7, step: 1 },
      { key: 'strides', label: 'Strides', type: 'number', defaultValue: 1, min: 1, max: 4, step: 1 },
      { key: 'padding', label: 'Padding', type: 'select', defaultValue: 'valid', options: paddingOptions.map(p => ({ label: p, value: p })) },
      { key: 'activation', label: 'Activation', type: 'select', defaultValue: 'relu', options: activations.map(a => ({ label: a, value: a })) },
    ],
  },
  {
    type: 'conv1d',
    label: 'Conv1D',
    color: '#9C27B0',
    icon: 'show_chart',
    description: '1D Convolution layer',
    inputs: 1,
    outputs: 1,
    defaultParams: { filters: 32, kernelSize: 3, strides: 1, padding: 'valid', activation: 'relu' },
    paramDefinitions: [
      { key: 'filters', label: 'Filters', type: 'number', defaultValue: 32, min: 1, max: 1024, step: 1 },
      { key: 'kernelSize', label: 'Kernel Size', type: 'number', defaultValue: 3, min: 1, max: 7, step: 1 },
      { key: 'strides', label: 'Strides', type: 'number', defaultValue: 1, min: 1, max: 4, step: 1 },
      { key: 'padding', label: 'Padding', type: 'select', defaultValue: 'valid', options: paddingOptions.map(p => ({ label: p, value: p })) },
      { key: 'activation', label: 'Activation', type: 'select', defaultValue: 'relu', options: activations.map(a => ({ label: a, value: a })) },
    ],
  },
  {
    type: 'lstm',
    label: 'LSTM',
    color: '#FF9800',
    icon: 'sync_alt',
    description: 'Long Short-Term Memory',
    inputs: 1,
    outputs: 1,
    defaultParams: { units: 32, activation: 'tanh', recurrentActivation: 'sigmoid', returnSequences: false },
    paramDefinitions: [
      { key: 'units', label: 'Units', type: 'number', defaultValue: 32, min: 1, max: 1024, step: 1 },
      { key: 'activation', label: 'Activation', type: 'select', defaultValue: 'tanh', options: activations.map(a => ({ label: a, value: a })) },
      { key: 'recurrentActivation', label: 'Recurrent Activation', type: 'select', defaultValue: 'sigmoid', options: ['sigmoid', 'tanh', 'relu', 'hardSigmoid'].map(a => ({ label: a, value: a })) },
      { key: 'returnSequences', label: 'Return Sequences', type: 'boolean', defaultValue: false },
    ],
  },
  {
    type: 'gru',
    label: 'GRU',
    color: '#FF9800',
    icon: 'cycle',
    description: 'Gated Recurrent Unit',
    inputs: 1,
    outputs: 1,
    defaultParams: { units: 32, activation: 'tanh', recurrentActivation: 'sigmoid', returnSequences: false },
    paramDefinitions: [
      { key: 'units', label: 'Units', type: 'number', defaultValue: 32, min: 1, max: 1024, step: 1 },
      { key: 'activation', label: 'Activation', type: 'select', defaultValue: 'tanh', options: activations.map(a => ({ label: a, value: a })) },
      { key: 'recurrentActivation', label: 'Recurrent Activation', type: 'select', defaultValue: 'sigmoid', options: ['sigmoid', 'tanh', 'relu', 'hardSigmoid'].map(a => ({ label: a, value: a })) },
      { key: 'returnSequences', label: 'Return Sequences', type: 'boolean', defaultValue: false },
    ],
  },
  {
    type: 'simple_rnn',
    label: 'SimpleRNN',
    color: '#FF9800',
    icon: 'repeat',
    description: 'Simple Recurrent Neural Network',
    inputs: 1,
    outputs: 1,
    defaultParams: { units: 32, activation: 'tanh', returnSequences: false },
    paramDefinitions: [
      { key: 'units', label: 'Units', type: 'number', defaultValue: 32, min: 1, max: 1024, step: 1 },
      { key: 'activation', label: 'Activation', type: 'select', defaultValue: 'tanh', options: activations.map(a => ({ label: a, value: a })) },
      { key: 'returnSequences', label: 'Return Sequences', type: 'boolean', defaultValue: false },
    ],
  },
  {
    type: 'flatten',
    label: 'Flatten',
    color: '#607D8B',
    icon: 'unfold_less',
    description: 'Flatten input to 1D',
    inputs: 1,
    outputs: 1,
    defaultParams: {},
    paramDefinitions: [],
  },
  {
    type: 'dropout',
    label: 'Dropout',
    color: '#F44336',
    icon: 'blur_on',
    description: 'Dropout for regularization',
    inputs: 1,
    outputs: 1,
    defaultParams: { rate: 0.5 },
    paramDefinitions: [
      { key: 'rate', label: 'Rate', type: 'number', defaultValue: 0.5, min: 0, max: 0.99, step: 0.05 },
    ],
  },
  {
    type: 'batch_norm',
    label: 'BatchNorm',
    color: '#00BCD4',
    icon: 'equalizer',
    description: 'Batch Normalization',
    inputs: 1,
    outputs: 1,
    defaultParams: {},
    paramDefinitions: [],
  },
  {
    type: 'max_pool_2d',
    label: 'MaxPool2D',
    color: '#795548',
    icon: 'keyboard_double_arrow_down',
    description: 'Max Pooling 2D',
    inputs: 1,
    outputs: 1,
    defaultParams: { poolSize: 2, strides: 2, padding: 'valid' },
    paramDefinitions: [
      { key: 'poolSize', label: 'Pool Size', type: 'number', defaultValue: 2, min: 1, max: 5, step: 1 },
      { key: 'strides', label: 'Strides', type: 'number', defaultValue: 2, min: 1, max: 5, step: 1 },
      { key: 'padding', label: 'Padding', type: 'select', defaultValue: 'valid', options: paddingOptions.map(p => ({ label: p, value: p })) },
    ],
  },
  {
    type: 'avg_pool_2d',
    label: 'AvgPool2D',
    color: '#795548',
    icon: 'south',
    description: 'Average Pooling 2D',
    inputs: 1,
    outputs: 1,
    defaultParams: { poolSize: 2, strides: 2, padding: 'valid' },
    paramDefinitions: [
      { key: 'poolSize', label: 'Pool Size', type: 'number', defaultValue: 2, min: 1, max: 5, step: 1 },
      { key: 'strides', label: 'Strides', type: 'number', defaultValue: 2, min: 1, max: 5, step: 1 },
      { key: 'padding', label: 'Padding', type: 'select', defaultValue: 'valid', options: paddingOptions.map(p => ({ label: p, value: p })) },
    ],
  },
  {
    type: 'reshape',
    label: 'Reshape',
    color: '#607D8B',
    icon: 'transform',
    description: 'Reshape input tensor',
    inputs: 1,
    outputs: 1,
    defaultParams: { targetShape: [10] },
    paramDefinitions: [
      { key: 'targetShape', label: 'Target Shape', type: 'array', defaultValue: [10], placeholder: 'e.g. 28,28,1' },
    ],
  },
  {
    type: 'embedding',
    label: 'Embedding',
    color: '#E91E63',
    icon: 'text_fields',
    description: 'Embedding layer for categorical data',
    inputs: 1,
    outputs: 1,
    defaultParams: { inputDim: 100, outputDim: 16 },
    paramDefinitions: [
      { key: 'inputDim', label: 'Input Dim', type: 'number', defaultValue: 100, min: 1, max: 100000, step: 1 },
      { key: 'outputDim', label: 'Output Dim', type: 'number', defaultValue: 16, min: 1, max: 1024, step: 1 },
    ],
  },
  {
    type: 'global_avg_pool_2d',
    label: 'GlobalAvgPool2D',
    color: '#795548',
    icon: 'public',
    description: 'Global Average Pooling 2D',
    inputs: 1,
    outputs: 1,
    defaultParams: {},
    paramDefinitions: [],
  },
  {
    type: 'global_max_pool_2d',
    label: 'GlobalMaxPool2D',
    color: '#795548',
    icon: 'language',
    description: 'Global Max Pooling 2D',
    inputs: 1,
    outputs: 1,
    defaultParams: {},
    paramDefinitions: [],
  },
  {
    type: 'concatenate',
    label: 'Concatenate',
    color: '#673AB7',
    icon: 'merge_type',
    description: 'Concatenate multiple inputs',
    inputs: 2,
    outputs: 1,
    defaultParams: { axis: -1 },
    paramDefinitions: [
      { key: 'axis', label: 'Axis', type: 'number', defaultValue: -1, min: -1, max: 5, step: 1 },
    ],
  },
];

export function getLayerTypeDef(type: GraphNodeType): LayerTypeDefinition | undefined {
  return LAYER_TYPES.find(lt => lt.type === type);
}

export function generateNodeId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function generateEdgeId(): string {
  return `edge_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function generatePortId(): string {
  return `port_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
