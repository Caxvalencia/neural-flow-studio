import { Component, computed, HostListener, inject, signal } from '@angular/core';

import { CanvasComponent } from './canvas/canvas';
import { ConfigPanelComponent } from './config-panel/config-panel';
import { GraphService } from './services/graph.service';
import { TooltipDirective } from './shared/tooltip.directive';
import { TrainPanelComponent } from './train-panel/train-panel';

@Component({
  selector: 'app-root',
  imports: [CanvasComponent, ConfigPanelComponent, TrainPanelComponent, TooltipDirective],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private graphService = inject(GraphService);

  title = signal('Neural Flow Studio');
  activePanel = signal<'config' | 'train'>('config');
  shortcutsOpen = signal(false);
  selectedNode = this.graphService.selectedNode;
  savedAt = this.graphService.savedAt;
  nodeCount = computed(() => this.graphService.nodes().length);
  edgeCount = computed(() => this.graphService.edges().length);
  hasSelectedNode = computed(() => !!this.selectedNode());

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.shortcutsOpen()) {
      event.preventDefault();
      this.closeShortcuts();
      return;
    }

    if (this.isTypingTarget(event.target)) return;

    if (event.key === '?' || (event.shiftKey && event.key === '/')) {
      event.preventDefault();
      this.openShortcuts();
      return;
    }

    if ((event.key === 'Delete' || event.key === 'Backspace') && this.hasSelectedNode()) {
      event.preventDefault();
      this.deleteSelectedNode();
    }

    if (
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === 'd' &&
      this.hasSelectedNode()
    ) {
      event.preventDefault();
      this.duplicateSelectedNode();
    }
  }

  setPanel(panel: 'config' | 'train') {
    this.activePanel.set(panel);
  }

  openShortcuts() {
    this.shortcutsOpen.set(true);
  }

  closeShortcuts() {
    this.shortcutsOpen.set(false);
  }

  closeConfig() {
    this.graphService.selectNode(null);
  }

  deleteSelectedNode() {
    this.graphService.removeSelectedNode();
  }

  duplicateSelectedNode() {
    this.graphService.duplicateSelectedNode();
  }

  loadTemplate(template: 'dense-classifier' | 'cnn-classifier') {
    this.graphService.loadTemplate(template);
    this.activePanel.set('train');
  }

  exportGraph() {
    const blob = new Blob([this.graphService.exportGraph()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'neural-flow-studio-graph.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  importGraph() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          this.graphService.importGraph(reader.result);
          this.activePanel.set('config');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  clearGraph() {
    if (confirm('Clear the current neural graph?')) {
      this.graphService.clearGraph();
    }
  }

  restoreAutosave() {
    this.graphService.restoreFromLocalStorage();
  }

  clearAutosave() {
    if (confirm('Clear local autosave? The current canvas will stay open.')) {
      this.graphService.clearAutosave();
    }
  }

  private isTypingTarget(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;
    if (!element) return false;
    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) || element.isContentEditable;
  }
}
