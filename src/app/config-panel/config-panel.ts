import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { GraphNode } from '../models/graph.model';
import { getLayerTypeDef, ParamDefinition } from '../models/layer-types';
import { GraphService } from '../services/graph.service';
import { TooltipDirective } from '../shared/tooltip.directive';

@Component({
  selector: 'app-config-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, TooltipDirective],
  templateUrl: './config-panel.html',
  styleUrl: './config-panel.scss',
})
export class ConfigPanelComponent {
  private graphService = inject(GraphService);

  @Input() node: GraphNode | null = null;
  @Output() close = new EventEmitter<void>();

  layerDef = computed(() => (this.node ? getLayerTypeDef(this.node!.type) : null));
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
      value
        .split(',')
        .map((part) => Number.parseFloat(part.trim()))
        .filter((value) => !Number.isNaN(value)),
    );
  }

  getParamDef(key: string): ParamDefinition | undefined {
    return this.layerDef()?.paramDefinitions.find((p) => p.key === key);
  }

  trackByKey(index: number, item: { key: string }) {
    return item.key;
  }

  formatValue(value: any): string {
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  }

  getParamTooltip(param: ParamDefinition): string {
    const parts = [`${param.label}: ${this.describeParam(param)}`];

    if (param.min !== undefined || param.max !== undefined) {
      parts.push(`Rango: ${param.min ?? 'sin minimo'} a ${param.max ?? 'sin maximo'}.`);
    }

    if (param.defaultValue !== undefined) {
      parts.push(`Valor por defecto: ${this.formatValue(param.defaultValue)}.`);
    }

    return parts.join(' ');
  }

  private describeParam(param: ParamDefinition): string {
    switch (param.type) {
      case 'array':
        return 'lista de dimensiones separadas por coma.';
      case 'boolean':
        return 'activa o desactiva esta opcion.';
      case 'number':
        return 'valor numerico que modifica el comportamiento de la capa.';
      case 'select':
        return 'selecciona una opcion compatible para esta capa.';
      default:
        return 'valor de configuracion de la capa.';
    }
  }

  deleteNode() {
    if (!this.node) {
      return;
    }

    this.graphService.removeNode(this.node.id);
    this.close.emit();
  }
}
