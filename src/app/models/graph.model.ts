export type GraphNodeType =
  | 'input'
  | 'dense'
  | 'conv2d'
  | 'conv1d'
  | 'lstm'
  | 'gru'
  | 'simple_rnn'
  | 'flatten'
  | 'dropout'
  | 'batch_norm'
  | 'max_pool_2d'
  | 'avg_pool_2d'
  | 'reshape'
  | 'embedding'
  | 'global_avg_pool_2d'
  | 'global_max_pool_2d'
  | 'concatenate';

export interface Port {
  id: string;
  nodeId: string;
  type: 'input' | 'output';
  index: number;
  label: string;
}

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  x: number;
  y: number;
  params: Record<string, any>;
  inputPorts: Port[];
  outputPorts: Port[];
}

export interface Edge {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
}

export interface ConnectionDragState {
  active: boolean;
  sourceNodeId: string;
  sourcePortId: string;
  sourcePortType: 'input' | 'output';
  mouseX: number;
  mouseY: number;
}
