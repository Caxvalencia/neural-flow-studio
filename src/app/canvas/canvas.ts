import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  signal,
  ViewChild,
} from '@angular/core';

import { Edge } from '../models/graph.model';
import { getLayerTypeDef, LAYER_TYPES } from '../models/layer-types';
import { NodeComponent } from '../node/node';
import { GraphService } from '../services/graph.service';
import { TooltipDirective } from '../shared/tooltip.directive';

const NODE_MIN_WIDTH = 240;
const NODE_HEADER_HEIGHT = 41;
const NODE_PORTS_MIN_HEIGHT = 80;
const PORT_ROW_HEIGHT = 28;
const PORT_AREA_PADDING = 24;

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule, NodeComponent, TooltipDirective],
  templateUrl: './canvas.html',
  styleUrl: './canvas.scss',
})
export class CanvasComponent implements AfterViewInit {
  @ViewChild('canvasContainer') canvasContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('svgOverlay') svgOverlay!: ElementRef<SVGSVGElement>;

  graphService = inject(GraphService);

  layerTypes = LAYER_TYPES;
  nodes = this.graphService.nodes;
  edges = this.graphService.edges;
  selectedNodeId = this.graphService.selectedNodeId;
  connectionDrag = this.graphService.connectionDrag;
  canvasTransform = this.graphService.canvasTransform;

  isPanning = signal(false);
  lastPanPoint = signal({ x: 0, y: 0 });
  showGrid = signal(true);
  private panMoved = false;
  private ignoreNextConnectionPointerUp = false;

  ngAfterViewInit() {
    this.updateSVGSize();
  }

  @HostListener('window:resize')
  onResize() {
    this.updateSVGSize();
  }

  private updateSVGSize() {
    if (this.canvasContainer?.nativeElement) {
      const rect = this.canvasContainer.nativeElement.getBoundingClientRect();
    }
  }

  get transformStyle() {
    const t = this.canvasTransform();
    return `translate(${t.x}px, ${t.y}px) scale(${t.scale})`;
  }

  onCanvasPointerDown(event: PointerEvent) {
    if (
      event.button === 1 ||
      (event.button === 0 && (event.altKey || this.isEmptyCanvasTarget(event.target)))
    ) {
      this.startPan(event);
    }
  }

  onCanvasPointerMove(event: PointerEvent) {
    if (this.isPanning()) {
      this.pan(event);
    } else if (this.connectionDrag().active) {
      const point = this.clientPointToGraph(event.clientX, event.clientY);
      this.graphService.updateConnectionDrag(point.x, point.y);
    }
  }

  onCanvasPointerUp(event: PointerEvent) {
    if (this.isPanning()) {
      this.endPan();
    }
  }

  onCanvasPointerLeave(event: PointerEvent) {
    if (this.isPanning()) {
      this.endPan();
    }
  }

  @HostListener('window:pointerup', ['$event'])
  onWindowPointerUp(event: PointerEvent) {
    if (this.isPanning()) {
      this.endPan();
    }
    if (this.connectionDrag().active) {
      const completed = this.tryCompleteConnectionAt(event.clientX, event.clientY);
      if (!completed) {
        if (this.ignoreNextConnectionPointerUp) {
          this.ignoreNextConnectionPointerUp = false;
          return;
        }
        this.graphService.cancelConnectionDrag();
      }
    }
  }

  @HostListener('window:pointermove', ['$event'])
  onWindowPointerMove(event: PointerEvent) {
    if (this.isPanning()) {
      this.pan(event);
    } else if (this.connectionDrag().active) {
      const point = this.clientPointToGraph(event.clientX, event.clientY);
      this.graphService.updateConnectionDrag(point.x, point.y);
    }
  }

  private startPan(event: PointerEvent) {
    event.preventDefault();
    this.isPanning.set(true);
    this.panMoved = false;
    this.lastPanPoint.set({ x: event.clientX, y: event.clientY });
    this.canvasContainer?.nativeElement?.setPointerCapture(event.pointerId);
  }

  private pan(event: PointerEvent) {
    const last = this.lastPanPoint();
    const dx = event.clientX - last.x;
    const dy = event.clientY - last.y;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      this.panMoved = true;
    }
    this.graphService.panCanvas(dx, dy);
    this.lastPanPoint.set({ x: event.clientX, y: event.clientY });
  }

  private endPan() {
    this.isPanning.set(false);
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    const container = this.canvasContainer?.nativeElement;
    if (!container) return;

    if (!event.ctrlKey && !event.metaKey) {
      const dx = event.shiftKey ? -event.deltaY : -event.deltaX;
      const dy = event.shiftKey ? 0 : -event.deltaY;
      this.graphService.panCanvas(dx, dy);
      return;
    }

    const rect = container.getBoundingClientRect();
    const centerX = event.clientX - rect.left;
    const centerY = event.clientY - rect.top;
    const scaleDelta = event.deltaY > 0 ? -0.1 : 0.1;
    this.graphService.zoomCanvas(scaleDelta, centerX, centerY);
  }

  onCanvasClick(event: MouseEvent) {
    if (this.panMoved) {
      this.panMoved = false;
      return;
    }

    if (
      event.target === this.canvasContainer?.nativeElement ||
      event.target === this.svgOverlay?.nativeElement ||
      this.isEmptyCanvasTarget(event.target)
    ) {
      if (this.connectionDrag().active) {
        this.graphService.cancelConnectionDrag();
        this.ignoreNextConnectionPointerUp = false;
      }
      this.graphService.selectNode(null);
    }
  }

  private isEmptyCanvasTarget(target: EventTarget | null): boolean {
    const element = target as HTMLElement | SVGElement | null;
    if (!element) return false;

    return (
      element === this.canvasContainer?.nativeElement ||
      element === this.svgOverlay?.nativeElement ||
      element.classList.contains('grid-overlay') ||
      element.classList.contains('nodes-layer') ||
      element.classList.contains('connection-overlay')
    );
  }

  onLayerDragStart(event: DragEvent, layerType: string) {
    event.dataTransfer?.setData('layer-type', layerType);
    event.dataTransfer!.effectAllowed = 'copy';
  }

  onCanvasDrop(event: DragEvent) {
    event.preventDefault();
    const layerType = event.dataTransfer?.getData('layer-type');
    if (!layerType) return;

    const container = this.canvasContainer?.nativeElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const transform = this.canvasTransform();

    const x = (event.clientX - rect.left - transform.x) / transform.scale;
    const y = (event.clientY - rect.top - transform.y) / transform.scale;

    this.graphService.addNode(layerType as any, x, y);
  }

  onCanvasDragOver(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
  }

  onConnectionComplete(targetNodeId: string, targetPortId: string) {
    this.graphService.endConnectionDrag(targetNodeId, targetPortId);
    this.ignoreNextConnectionPointerUp = false;
  }

  onPortClick(event: {
    nodeId: string;
    portId: string;
    portType: 'input' | 'output';
    event: MouseEvent;
  }) {
    if (event.portType === 'input') {
      if (this.connectionDrag().active) {
        this.graphService.endConnectionDrag(event.nodeId, event.portId);
      }
      return;
    }

    const portPosition = this.getPortPosition(event.nodeId, event.portId);
    this.graphService.startConnectionDrag(
      event.nodeId,
      event.portId,
      event.portType,
      portPosition.x,
      portPosition.y,
    );
  }

  private tryCompleteConnectionAt(clientX: number, clientY: number): boolean {
    const element = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const portElement = element?.closest('[data-port-type="input"]') as HTMLElement | null;
    const targetNodeId = portElement?.dataset['nodeId'];
    const targetPortId = portElement?.dataset['portId'];

    if (targetNodeId && targetPortId) {
      const completed = !!this.graphService.endConnectionDrag(targetNodeId, targetPortId);
      if (completed) this.ignoreNextConnectionPointerUp = false;
      return completed;
    }

    const nearestPort = this.findNearestInputPort(clientX, clientY);
    if (!nearestPort) return false;
    const completed = !!this.graphService.endConnectionDrag(nearestPort.nodeId, nearestPort.portId);
    if (completed) this.ignoreNextConnectionPointerUp = false;
    return completed;
  }

  private findNearestInputPort(
    clientX: number,
    clientY: number,
  ): { nodeId: string; portId: string } | null {
    const graphPoint = this.clientPointToGraph(clientX, clientY);
    const radius = 42 / this.canvasTransform().scale;
    let nearest: { nodeId: string; portId: string; distance: number } | null = null;

    for (const node of this.nodes()) {
      for (const port of node.inputPorts) {
        const portPosition = this.getPortPosition(node.id, port.id);
        const distance = Math.hypot(graphPoint.x - portPosition.x, graphPoint.y - portPosition.y);
        if (distance <= radius && (!nearest || distance < nearest.distance)) {
          nearest = { nodeId: node.id, portId: port.id, distance };
        }
      }
    }

    return nearest ? { nodeId: nearest.nodeId, portId: nearest.portId } : null;
  }

  onNodeDrag(event: { nodeId: string; dx: number; dy: number }) {
    const node = this.nodes().find((n) => n.id === event.nodeId);
    if (!node) return;
    this.graphService.updateNodePosition(event.nodeId, node.x + event.dx, node.y + event.dy);
  }

  onPortDragStart(event: {
    nodeId: string;
    portId: string;
    portType: 'input' | 'output';
    event: PointerEvent;
  }) {
    const point = this.clientPointToGraph(event.event.clientX, event.event.clientY);
    this.ignoreNextConnectionPointerUp = true;
    this.graphService.startConnectionDrag(
      event.nodeId,
      event.portId,
      event.portType,
      point.x,
      point.y,
    );
  }

  private clientPointToGraph(clientX: number, clientY: number): { x: number; y: number } {
    const container = this.canvasContainer?.nativeElement;
    if (!container) return { x: clientX, y: clientY };

    const rect = container.getBoundingClientRect();
    const transform = this.canvasTransform();
    return {
      x: (clientX - rect.left - transform.x) / transform.scale,
      y: (clientY - rect.top - transform.y) / transform.scale,
    };
  }

  trackByNodeId(index: number, node: { id: string }) {
    return node.id;
  }

  trackByEdgeId(index: number, edge: { id: string }) {
    return edge.id;
  }

  resetView() {
    this.graphService.resetCanvas();
  }

  zoomIn() {
    const container = this.canvasContainer?.nativeElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      this.graphService.zoomCanvas(0.2, rect.width / 2, rect.height / 2);
    }
  }

  zoomOut() {
    const container = this.canvasContainer?.nativeElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      this.graphService.zoomCanvas(-0.2, rect.width / 2, rect.height / 2);
    }
  }

  toggleGrid() {
    this.showGrid.update((v) => !v);
  }

  getPortPosition(nodeId: string, portId: string): { x: number; y: number } {
    const measuredPosition = this.getMeasuredPortPosition(nodeId, portId);
    if (measuredPosition) return measuredPosition;

    const node = this.nodes().find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };

    const port = [...node.inputPorts, ...node.outputPorts].find((p) => p.id === portId);
    if (!port) {
      return {
        x: node.x + NODE_MIN_WIDTH / 2,
        y: node.y + NODE_HEADER_HEIGHT + NODE_PORTS_MIN_HEIGHT / 2,
      };
    }

    const portIndex =
      port.type === 'input'
        ? node.inputPorts.findIndex((p) => p.id === portId)
        : node.outputPorts.findIndex((p) => p.id === portId);

    const portCount = port.type === 'input' ? node.inputPorts.length : node.outputPorts.length;
    const maxPortCount = Math.max(node.inputPorts.length, node.outputPorts.length);
    const portAreaHeight = Math.max(
      NODE_PORTS_MIN_HEIGHT,
      maxPortCount * PORT_ROW_HEIGHT + PORT_AREA_PADDING,
    );
    const spacing = portAreaHeight / (portCount + 1);
    const y = node.y + NODE_HEADER_HEIGHT + spacing * (portIndex + 1);
    const x = port.type === 'input' ? node.x : node.x + NODE_MIN_WIDTH;

    return { x, y };
  }

  private getMeasuredPortPosition(nodeId: string, portId: string): { x: number; y: number } | null {
    const container = this.canvasContainer?.nativeElement;
    if (!container) return null;

    const portElement = Array.from(
      container.querySelectorAll<HTMLElement>('[data-node-id][data-port-id]'),
    ).find(
      (element) => element.dataset['nodeId'] === nodeId && element.dataset['portId'] === portId,
    );

    const dotElement = portElement?.querySelector<HTMLElement>('.port-dot');
    if (!dotElement) return null;

    const rect = dotElement.getBoundingClientRect();
    return this.clientPointToGraph(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  getEdgePath(edge: Edge): string {
    const source = this.getPortPosition(edge.sourceNodeId, edge.sourcePortId);
    const target = this.getPortPosition(edge.targetNodeId, edge.targetPortId);
    return this.generateConnectionPath(source, target);
  }

  getPreviewPath(): string {
    const drag = this.connectionDrag();
    const source = this.getPortPosition(drag.sourceNodeId, drag.sourcePortId);
    const target = { x: drag.mouseX, y: drag.mouseY };
    return this.generateConnectionPath(source, target);
  }

  private generateConnectionPath(
    source: { x: number; y: number },
    target: { x: number; y: number },
  ): string {
    const dx = target.x - source.x;
    const curveStrength = Math.max(60, Math.min(Math.abs(dx) * 0.5, 180));
    const direction = dx >= 0 ? 1 : -1;
    const cp1x = source.x + curveStrength * direction;
    const cp1y = source.y;
    const cp2x = target.x - curveStrength * direction;
    const cp2y = target.y;

    return `M ${source.x} ${source.y} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${target.x} ${target.y}`;
  }
}
