import {
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Edge, GraphNode } from '../models/graph.model';

@Component({
  selector: 'app-edge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './connection.html',
  styleUrl: './connection.scss',
})
export class EdgeComponent {
  @Input({ required: true }) edge!: Edge;
  @Input({ required: true }) nodes!: GraphNode[];
  @Output() remove = new EventEmitter<string>();

  sourcePos = computed(() => this.getPortPosition(this.edge.sourceNodeId, this.edge.sourcePortId));
  targetPos = computed(() => this.getPortPosition(this.edge.targetNodeId, this.edge.targetPortId));
  pathData = computed(() => this.generatePath(this.sourcePos(), this.targetPos()));

  private getPortPosition(nodeId: string, portId: string): { x: number; y: number } {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };

    const port = [...node.inputPorts, ...node.outputPorts].find(p => p.id === portId);
    if (!port) return { x: node.x + 120, y: node.y + 30 };

    const portIndex = port.type === 'input'
      ? node.inputPorts.findIndex(p => p.id === portId)
      : node.outputPorts.findIndex(p => p.id === portId);

    const portCount = port.type === 'input' ? node.inputPorts.length : node.outputPorts.length;
    const nodeHeight = 60 + Math.max(node.inputPorts.length, node.outputPorts.length) * 28;
    const spacing = nodeHeight / (portCount + 1);
    const y = node.y + spacing * (portIndex + 1);
    const x = port.type === 'input' ? node.x : node.x + 240;

    return { x, y };
  }

  private generatePath(source: { x: number; y: number }, target: { x: number; y: number }): string {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const curveStrength = Math.min(Math.abs(dx) * 0.5, 100);

    const cp1x = source.x + curveStrength;
    const cp1y = source.y;
    const cp2x = target.x - curveStrength;
    const cp2y = target.y;

    return `M ${source.x} ${source.y} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${target.x} ${target.y}`;
  }

  onRemove(event: MouseEvent) {
    event.stopPropagation();
    this.remove.emit(this.edge.id);
  }
}
