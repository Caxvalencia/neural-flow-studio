import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GraphService } from '../services/graph.service';
import { getLayerTypeDef, ParamDefinition } from '../models/layer-types';
import { GraphNode } from '../models/graph.model';

@Component({
  selector: 'app-config-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './config-panel.html',
  styleUrl: './config-panel.scss',
})
export class ConfigPanelComponent {
  private graphService = inject(GraphService);

  @Input() node: GraphNode | null = null;
  @Output() close = new EventEmitter<void>();

  layerDef = computed(() => this.node ? getLayerTypeDef(this.node!.type) : null);
  paramDefinitions = computed(() => this.layerDef()?.paramDefinitions ?? []);
  layerTypeLabel = computed(() => this.layerDef()?.type.toUpperCase() ?? 'LAYER');
  params = computed(() => this.node?.params || {});

  updateParam(key: string, value: any) {
    if (!this.node) return;
    this.graphService.updateNodeParams(this.node.id, { [key]: value });
  }

  updateNumberParam(key: string, value: string) {
    this.updateParam(key, Number.parseFloat(value) || 0);
  }

  updateArrayParam(key: string, value: string) {
    this.updateParam(
      key,
      value.split(',').map(part => Number.parseFloat(part.trim())).filter(value => !Number.isNaN(value)),
    );
  }

  getParamDef(key: string): ParamDefinition | undefined {
    return this.layerDef()?.paramDefinitions.find(p => p.key === key);
  }

  trackByKey(index: number, item: { key: string }) {
    return item.key;
  }

  formatValue(value: any): string {
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  }

  deleteNode() {
    if (!this.node) return;
    this.graphService.removeNode(this.node.id);
    this.close.emit();
  }
}
