import { Injectable, signal, computed, effect } from '@angular/core';
import {
  GraphNode,
  GraphNodeType,
  Edge,
  Port,
  ConnectionDragState,
} from '../models/graph.model';
import {
  getLayerTypeDef,
  generateNodeId,
  generateEdgeId,
  generatePortId,
} from '../models/layer-types';

const AUTOSAVE_KEY = 'neural-flow-studio.graph';

interface GraphState {
  nodes: GraphNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  connectionDrag: ConnectionDragState;
  canvasTransform: { x: number; y: number; scale: number };
}

const initialState: GraphState = {
  nodes: [],
  edges: [],
  selectedNodeId: null,
  connectionDrag: {
    active: false,
    sourceNodeId: '',
    sourcePortId: '',
    sourcePortType: 'output',
    mouseX: 0,
    mouseY: 0,
  },
  canvasTransform: { x: 0, y: 0, scale: 1 },
};

@Injectable({ providedIn: 'root' })
export class GraphService {
  private state = signal<GraphState>(initialState);
  private restoring = false;

  nodes = computed(() => this.state().nodes);
  edges = computed(() => this.state().edges);
  selectedNodeId = computed(() => this.state().selectedNodeId);
  connectionDrag = computed(() => this.state().connectionDrag);
  canvasTransform = computed(() => this.state().canvasTransform);
  private autosaveSnapshot = computed(() => JSON.stringify({
    nodes: this.nodes(),
    edges: this.edges(),
    canvasTransform: this.canvasTransform(),
  }, null, 2));

  selectedNode = computed(() => {
    const id = this.selectedNodeId();
    if (!id) return null;
    return this.nodes().find(n => n.id === id) || null;
  });

  savedAt = signal<string | null>(null);

  constructor() {
    this.restoreFromLocalStorage();
    effect(() => {
      const snapshot = this.autosaveSnapshot();
      if (this.restoring) return;
      localStorage.setItem(AUTOSAVE_KEY, snapshot);
      this.savedAt.set(new Date().toLocaleTimeString());
    });
  }

  getNodeById(id: string): GraphNode | undefined {
    return this.nodes().find(n => n.id === id);
  }

  getIncomingEdges(nodeId: string): Edge[] {
    return this.edges().filter(e => e.targetNodeId === nodeId);
  }

  getOutgoingEdges(nodeId: string): Edge[] {
    return this.edges().filter(e => e.sourceNodeId === nodeId);
  }

  getConnectedSourceNodes(nodeId: string): GraphNode[] {
    const incoming = this.getIncomingEdges(nodeId);
    return incoming
      .map(e => this.getNodeById(e.sourceNodeId))
      .filter((n): n is GraphNode => n !== undefined);
  }

  getConnectedTargetNodes(nodeId: string): GraphNode[] {
    const outgoing = this.getOutgoingEdges(nodeId);
    return outgoing
      .map(e => this.getNodeById(e.targetNodeId))
      .filter((n): n is GraphNode => n !== undefined);
  }

  updateState(partial: Partial<GraphState>) {
    this.state.update(current => ({ ...current, ...partial }));
  }

  addNode(type: GraphNodeType, x: number, y: number): GraphNode {
    const def = getLayerTypeDef(type);
    if (!def) throw new Error(`Unknown layer type: ${type}`);

    const nodeId = generateNodeId();
    const inputPorts: Port[] = Array.from({ length: def.inputs }, (_, i) => ({
      id: generatePortId(),
      nodeId,
      type: 'input' as const,
      index: i,
      label: `in${def.inputs > 1 ? i : ''}`,
    }));
    const outputPorts: Port[] = Array.from({ length: def.outputs }, (_, i) => ({
      id: generatePortId(),
      nodeId,
      type: 'output' as const,
      index: i,
      label: `out${def.outputs > 1 ? i : ''}`,
    }));

    const node: GraphNode = {
      id: nodeId,
      type,
      label: def.label,
      x,
      y,
      params: { ...def.defaultParams },
      inputPorts,
      outputPorts,
    };

    this.state.update(s => ({ ...s, nodes: [...s.nodes, node] }));
    return node;
  }

  removeNode(nodeId: string) {
    this.state.update(s => ({
      ...s,
      nodes: s.nodes.filter(n => n.id !== nodeId),
      edges: s.edges.filter(e => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId),
      selectedNodeId: s.selectedNodeId === nodeId ? null : s.selectedNodeId,
    }));
  }

  removeSelectedNode() {
    const selectedNodeId = this.selectedNodeId();
    if (selectedNodeId) {
      this.removeNode(selectedNodeId);
    }
  }

  duplicateNode(nodeId: string): GraphNode | null {
    const source = this.getNodeById(nodeId);
    if (!source) return null;

    const newNodeId = generateNodeId();
    const inputPorts: Port[] = source.inputPorts.map(port => ({
      ...port,
      id: generatePortId(),
      nodeId: newNodeId,
    }));
    const outputPorts: Port[] = source.outputPorts.map(port => ({
      ...port,
      id: generatePortId(),
      nodeId: newNodeId,
    }));
    const duplicated: GraphNode = {
      ...source,
      id: newNodeId,
      label: `${source.label} copy`,
      x: source.x + 48,
      y: source.y + 48,
      params: structuredClone(source.params),
      inputPorts,
      outputPorts,
    };

    this.state.update(s => ({
      ...s,
      nodes: [...s.nodes, duplicated],
      selectedNodeId: duplicated.id,
    }));

    return duplicated;
  }

  duplicateSelectedNode(): GraphNode | null {
    const selectedNodeId = this.selectedNodeId();
    return selectedNodeId ? this.duplicateNode(selectedNodeId) : null;
  }

  updateNodePosition(nodeId: string, x: number, y: number) {
    this.state.update(s => ({
      ...s,
      nodes: s.nodes.map(n => (n.id === nodeId ? { ...n, x, y } : n)),
    }));
  }

  updateNodeParams(nodeId: string, params: Record<string, any>) {
    this.state.update(s => ({
      ...s,
      nodes: s.nodes.map(n => (n.id === nodeId ? { ...n, params: { ...n.params, ...params } } : n)),
    }));
  }

  selectNode(nodeId: string | null) {
    this.state.update(s => ({ ...s, selectedNodeId: nodeId }));
  }

  startConnectionDrag(nodeId: string, portId: string, portType: 'input' | 'output', mouseX: number, mouseY: number) {
    this.state.update(s => ({
      ...s,
      connectionDrag: {
        active: true,
        sourceNodeId: nodeId,
        sourcePortId: portId,
        sourcePortType: portType,
        mouseX,
        mouseY,
      },
    }));
  }

  updateConnectionDrag(mouseX: number, mouseY: number) {
    this.state.update(s => ({
      ...s,
      connectionDrag: { ...s.connectionDrag, mouseX, mouseY },
    }));
  }

  endConnectionDrag(targetNodeId: string, targetPortId: string): Edge | null {
    const drag = this.state().connectionDrag;
    if (!drag.active) return null;
    if (drag.sourcePortType !== 'output') {
      this.state.update(s => ({ ...s, connectionDrag: initialState.connectionDrag }));
      return null;
    }

    if (drag.sourceNodeId === targetNodeId) {
      this.state.update(s => ({ ...s, connectionDrag: initialState.connectionDrag }));
      return null;
    }

    const sourceNode = this.getNodeById(drag.sourceNodeId);
    const targetNode = this.getNodeById(targetNodeId);
    if (!sourceNode || !targetNode) {
      this.state.update(s => ({ ...s, connectionDrag: initialState.connectionDrag }));
      return null;
    }

    const sourcePort = drag.sourcePortType === 'output'
      ? sourceNode.outputPorts.find(p => p.id === drag.sourcePortId)
      : sourceNode.inputPorts.find(p => p.id === drag.sourcePortId);

    const targetPort = targetNode.inputPorts.find(p => p.id === targetPortId);

    if (!sourcePort || !targetPort) {
      this.state.update(s => ({ ...s, connectionDrag: initialState.connectionDrag }));
      return null;
    }

    if (!this.canConnect(drag.sourceNodeId, drag.sourcePortId, targetNodeId, targetPortId)) {
      this.state.update(s => ({ ...s, connectionDrag: initialState.connectionDrag }));
      return null;
    }

    const edge: Edge = {
      id: generateEdgeId(),
      sourceNodeId: drag.sourceNodeId,
      sourcePortId: drag.sourcePortId,
      targetNodeId,
      targetPortId,
    };

    this.state.update(s => ({
      ...s,
      edges: [...s.edges, edge],
      connectionDrag: initialState.connectionDrag,
    }));

    return edge;
  }

  cancelConnectionDrag() {
    this.state.update(s => ({ ...s, connectionDrag: initialState.connectionDrag }));
  }

  removeEdge(edgeId: string) {
    this.state.update(s => ({
      ...s,
      edges: s.edges.filter(e => e.id !== edgeId),
    }));
  }

  addEdge(sourceNodeId: string, targetNodeId: string, targetPortIndex = 0): Edge | null {
    const sourceNode = this.getNodeById(sourceNodeId);
    const targetNode = this.getNodeById(targetNodeId);
    const sourcePort = sourceNode?.outputPorts[0];
    const targetPort = targetNode?.inputPorts[targetPortIndex];

    if (!sourceNode || !targetNode || !sourcePort || !targetPort) return null;
    if (!this.canConnect(sourceNodeId, sourcePort.id, targetNodeId, targetPort.id)) return null;

    const edge: Edge = {
      id: generateEdgeId(),
      sourceNodeId,
      sourcePortId: sourcePort.id,
      targetNodeId,
      targetPortId: targetPort.id,
    };

    this.state.update(s => ({ ...s, edges: [...s.edges, edge] }));
    return edge;
  }

  canConnect(sourceNodeId: string, sourcePortId: string, targetNodeId: string, targetPortId: string): boolean {
    if (sourceNodeId === targetNodeId) return false;
    const sourceNode = this.getNodeById(sourceNodeId);
    const targetNode = this.getNodeById(targetNodeId);
    if (!sourceNode || !targetNode) return false;
    if (!sourceNode.outputPorts.some(port => port.id === sourcePortId)) return false;
    if (!targetNode.inputPorts.some(port => port.id === targetPortId)) return false;

    const existing = this.edges().some(e =>
      e.sourceNodeId === sourceNodeId && e.sourcePortId === sourcePortId &&
      e.targetNodeId === targetNodeId && e.targetPortId === targetPortId
    );
    if (existing) return false;

    const targetPortAlreadyConnected = this.edges().some(e =>
      e.targetNodeId === targetNodeId && e.targetPortId === targetPortId
    );
    if (targetPortAlreadyConnected) return false;

    if (this.createsCycle(sourceNodeId, targetNodeId)) return false;

    return true;
  }

  private createsCycle(sourceNodeId: string, targetNodeId: string): boolean {
    const visited = new Set<string>();
    const stack = [targetNodeId];

    while (stack.length) {
      const current = stack.pop()!;
      if (current === sourceNodeId) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      for (const edge of this.edges().filter(e => e.sourceNodeId === current)) {
        stack.push(edge.targetNodeId);
      }
    }

    return false;
  }

  panCanvas(dx: number, dy: number) {
    this.state.update(s => ({
      ...s,
      canvasTransform: {
        ...s.canvasTransform,
        x: s.canvasTransform.x + dx,
        y: s.canvasTransform.y + dy,
      },
    }));
  }

  zoomCanvas(scaleDelta: number, centerX: number, centerY: number) {
    this.state.update(s => {
      const newScale = Math.max(0.1, Math.min(3, s.canvasTransform.scale + scaleDelta));
      const scaleRatio = newScale / s.canvasTransform.scale;
      return {
        ...s,
        canvasTransform: {
          x: centerX - (centerX - s.canvasTransform.x) * scaleRatio,
          y: centerY - (centerY - s.canvasTransform.y) * scaleRatio,
          scale: newScale,
        },
      };
    });
  }

  resetCanvas() {
    this.state.update(s => ({ ...s, canvasTransform: { x: 0, y: 0, scale: 1 } }));
  }

  clearGraph() {
    this.state.update(s => ({ ...s, nodes: [], edges: [], selectedNodeId: null }));
  }

  loadTemplate(template: 'dense-classifier' | 'cnn-classifier') {
    this.clearGraph();

    if (template === 'dense-classifier') {
      const input = this.addNode('input', 280, 160);
      const hidden = this.addNode('dense', 580, 140);
      const dropout = this.addNode('dropout', 880, 160);
      const output = this.addNode('dense', 1180, 140);

      this.updateNodeParams(input.id, { shape: [4] });
      this.updateNodeParams(hidden.id, { units: 16, activation: 'relu', useBias: true });
      this.updateNodeParams(dropout.id, { rate: 0.2 });
      this.updateNodeParams(output.id, { units: 3, activation: 'softmax', useBias: true });

      this.addEdge(input.id, hidden.id);
      this.addEdge(hidden.id, dropout.id);
      this.addEdge(dropout.id, output.id);
    }

    if (template === 'cnn-classifier') {
      const input = this.addNode('input', 240, 220);
      const conv = this.addNode('conv2d', 540, 200);
      const pool = this.addNode('max_pool_2d', 840, 220);
      const flatten = this.addNode('flatten', 1140, 220);
      const output = this.addNode('dense', 1440, 200);

      this.updateNodeParams(input.id, { shape: [28, 28, 1] });
      this.updateNodeParams(conv.id, { filters: 16, kernelSize: 3, strides: 1, padding: 'same', activation: 'relu' });
      this.updateNodeParams(pool.id, { poolSize: 2, strides: 2, padding: 'valid' });
      this.updateNodeParams(output.id, { units: 10, activation: 'softmax', useBias: true });

      this.addEdge(input.id, conv.id);
      this.addEdge(conv.id, pool.id);
      this.addEdge(pool.id, flatten.id);
      this.addEdge(flatten.id, output.id);
    }

    this.resetCanvas();
  }

  exportGraph(): string {
    return this.serializeGraph();
  }

  private serializeGraph(): string {
    const s = this.state();
    return JSON.stringify({
      nodes: s.nodes,
      edges: s.edges,
      canvasTransform: s.canvasTransform,
    }, null, 2);
  }

  importGraph(json: string) {
    try {
      const data = JSON.parse(json);
      if (data.nodes && data.edges) {
        this.state.update(s => ({
          ...s,
          nodes: data.nodes,
          edges: data.edges,
          canvasTransform: data.canvasTransform || s.canvasTransform,
          selectedNodeId: null,
          connectionDrag: initialState.connectionDrag,
        }));
      }
    } catch (e) {
      console.error('Failed to import graph:', e);
    }
  }

  restoreFromLocalStorage(): boolean {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (!saved) return false;

    this.restoring = true;
    this.importGraph(saved);
    this.restoring = false;
    this.savedAt.set('restored');
    return true;
  }

  clearAutosave() {
    localStorage.removeItem(AUTOSAVE_KEY);
    this.savedAt.set(null);
  }
}
