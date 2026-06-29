import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphNode } from '../models/graph.model';
import { getLayerTypeDef } from '../models/layer-types';

const NODE_PORTS_MIN_HEIGHT = 80;
const PORT_ROW_HEIGHT = 28;
const PORT_AREA_PADDING = 24;

@Component({
  selector: 'app-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './node.html',
  styleUrl: './node.scss',
})
export class NodeComponent {
  @Input({ required: true }) node!: GraphNode;
  @Input({ required: true }) isSelected!: boolean;
  @Input() connectionActive = false;
  @Input({ required: true }) canvasTransform!: { x: number; y: number; scale: number };
  @Input({ required: true }) getPortPosition!: (nodeId: string, portId: string) => { x: number; y: number };

  @Output() nodeClick = new EventEmitter<GraphNode>();
  @Output() remove = new EventEmitter<string>();
  @Output() portDragStart = new EventEmitter<{
    nodeId: string;
    portId: string;
    portType: 'input' | 'output';
    event: PointerEvent;
  }>();
  @Output() portDrop = new EventEmitter<{ targetNodeId: string; targetPortId: string }>();
  @Output() portClick = new EventEmitter<{
    nodeId: string;
    portId: string;
    portType: 'input' | 'output';
    event: MouseEvent;
  }>();
  @Output() nodeDrag = new EventEmitter<{ nodeId: string; dx: number; dy: number }>();

  layerDef = computed(() => getLayerTypeDef(this.node.type));
  paramDefinitions = computed(() => this.layerDef()?.paramDefinitions ?? []);
  layerTypeLabel = computed(() => this.layerDef()?.type.toUpperCase() ?? 'LAYER');

  isDragging = signal(false);
  dragStartPos = signal({ x: 0, y: 0 });

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent) {
    if (event.target === event.currentTarget ||
        (event.target as HTMLElement).classList.contains('node-header') ||
        (event.target as HTMLElement).classList.contains('node-body')) {
      this.startDrag(event);
    }
  }

  @HostListener('window:pointermove', ['$event'])
  onWindowPointerMove(event: PointerEvent) {
    if (this.isDragging()) {
      const dx = (event.clientX - this.dragStartPos().x) / this.canvasTransform.scale;
      const dy = (event.clientY - this.dragStartPos().y) / this.canvasTransform.scale;
      this.nodeDrag.emit({ nodeId: this.node.id, dx, dy });
      this.dragStartPos.set({ x: event.clientX, y: event.clientY });
    }
  }

  @HostListener('window:pointerup')
  onWindowPointerUp() {
    this.isDragging.set(false);
  }

  private startDrag(event: PointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
    this.dragStartPos.set({ x: event.clientX, y: event.clientY });
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    this.nodeClick.emit(this.node);
  }

  onPortPointerDown(event: PointerEvent, portId: string, portType: 'input' | 'output') {
    event.preventDefault();
    event.stopPropagation();
    if (portType === 'input') return;
    this.portDragStart.emit({
      nodeId: this.node.id,
      portId,
      portType,
      event,
    });
  }

  onPortPointerUp(event: PointerEvent, portId: string, portType: 'input' | 'output') {
    event.preventDefault();
    event.stopPropagation();
    if (portType === 'input') {
      this.portDrop.emit({ targetNodeId: this.node.id, targetPortId: portId });
    }
  }

  onPortClick(event: MouseEvent, portId: string, portType: 'input' | 'output') {
    event.preventDefault();
    event.stopPropagation();
    this.portClick.emit({
      nodeId: this.node.id,
      portId,
      portType,
      event,
    });
  }

  getPortY(portId: string, ports: GraphNode['inputPorts']): number {
    const index = ports.findIndex(p => p.id === portId);
    const count = ports.length;
    if (index < 0 || count === 0) return NODE_PORTS_MIN_HEIGHT / 2;

    const maxPortCount = Math.max(this.node.inputPorts.length, this.node.outputPorts.length);
    const portAreaHeight = Math.max(
      NODE_PORTS_MIN_HEIGHT,
      maxPortCount * PORT_ROW_HEIGHT + PORT_AREA_PADDING,
    );
    const spacing = portAreaHeight / (count + 1);
    return spacing * (index + 1);
  }

  getOutputPortY(portId: string): number {
    return this.getPortY(portId, this.node.outputPorts);
  }

  getInputPortY(portId: string): number {
    return this.getPortY(portId, this.node.inputPorts);
  }

  trackByPortId(index: number, port: { id: string }) {
    return port.id;
  }

  removeNode() {
    this.remove.emit(this.node.id);
  }

  formatParamValue(key: string): string {
    const value = this.node.params[key];
    if (Array.isArray(value)) return `[${value.join(', ')}]`;
    return String(value ?? '');
  }
}
