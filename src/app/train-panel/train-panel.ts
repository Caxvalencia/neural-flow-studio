import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TfjsBackend, TfjsService, TrainingConfig, TrainingData } from '../services/tfjs.service';

@Component({
  selector: 'app-train-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './train-panel.html',
  styleUrl: './train-panel.scss',
})
export class TrainPanelComponent {
  tfjsService = inject(TfjsService);

  config = signal<TrainingConfig>({
    epochs: 50,
    batchSize: 32,
    learningRate: 0.001,
    validationSplit: 0.2,
    optimizer: 'adam',
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  trainingData = signal<TrainingData>({ x: [], y: [] });
  dataInput = signal('');
  dataFormat = signal<'csv' | 'manual'>('csv');
  manualInputDim = 4;
  manualOutputDim = 3;
  manualSamples = 200;

  training = this.tfjsService.training;
  trainingMetrics = this.tfjsService.trainingMetrics;
  currentEpoch = this.tfjsService.currentEpoch;
  webgpuReady = this.tfjsService.webgpuReady;
  backendOptions = this.tfjsService.backendOptions;
  preferredBackend = this.tfjsService.preferredBackend;
  activeBackend = this.tfjsService.activeBackend;
  backendStatus = this.tfjsService.backendStatus;
  backendMessage = this.tfjsService.backendMessage;
  backendError = this.tfjsService.backendError;
  backendSwitching = this.tfjsService.backendSwitching;
  modelErrors = this.tfjsService.modelErrors;
  backend = computed(() => this.activeBackend());

  modelSummary = signal('');

  epochs = computed(() => this.config().epochs);

  lastLoss = computed(() => {
    const metrics = this.trainingMetrics();
    return metrics.length ? metrics[metrics.length - 1].loss : null;
  });

  lastValLoss = computed(() => {
    const metrics = this.trainingMetrics();
    return metrics.length ? metrics[metrics.length - 1].valLoss : null;
  });

  lastAccuracy = computed(() => {
    const metrics = this.trainingMetrics();
    return metrics.length ? metrics[metrics.length - 1].accuracy : null;
  });

  lastValAccuracy = computed(() => {
    const metrics = this.trainingMetrics();
    return metrics.length ? metrics[metrics.length - 1].valAccuracy : null;
  });

  maxLoss = computed(() => {
    const metrics = this.trainingMetrics();
    if (!metrics.length) return 1;
    return Math.max(...metrics.map((m) => m.loss), ...metrics.map((m) => m.valLoss || 0)) * 1.1;
  });

  shapeInfo = computed(() => this.tfjsService.getTrainingShapeInfo());

  buildModel() {
    const model = this.tfjsService.buildModelFromGraph();
    if (model) {
      this.modelSummary.set(this.tfjsService.getModelSummary());
    } else {
      this.modelSummary.set('Failed to build model. Check graph connections.');
    }
  }

  parseCSVData() {
    const text = this.dataInput().trim();
    if (!text) return;

    try {
      const lines = text.split('\n').filter((l) => l.trim());
      const data: number[][] = lines
        .map((line) =>
          line
            .split(',')
            .map((v) => parseFloat(v.trim()))
            .filter((v) => !isNaN(v)),
        )
        .filter((row) => row.length > 0);

      if (data.length === 0) return;

      const { inputSize, outputSize } = this.shapeInfo();
      const expectedColumns = inputSize + outputSize;
      const invalidRow = data.findIndex((row) => row.length !== expectedColumns);
      if (invalidRow >= 0) {
        alert(
          `CSV row ${invalidRow + 1} must have ${expectedColumns} columns (${inputSize} inputs + ${outputSize} outputs).`,
        );
        return;
      }

      const x = data.map((row) => row.slice(0, inputSize));
      const y = data.map((row) => row.slice(inputSize, inputSize + outputSize));

      this.trainingData.set({ x, y });
    } catch (e) {
      console.error('Failed to parse CSV:', e);
    }
  }

  generateSampleData() {
    const samples = this.manualSamples;
    const { inputSize, outputSize } = this.shapeInfo();
    this.manualInputDim = inputSize;
    this.manualOutputDim = outputSize;

    const x: number[][] = [];
    const y: number[][] = [];

    for (let i = 0; i < samples; i++) {
      const input = Array.from({ length: inputSize }, () => Math.random() * 2 - 1);
      const target = Array.from({ length: outputSize }, (_, j) =>
        j === Math.floor(Math.random() * outputSize) ? 1 : 0,
      );
      x.push(input);
      y.push(target);
    }

    this.trainingData.set({ x, y });
    this.dataInput.set(x.map((row, i) => [...row, ...y[i]].join(',')).join('\n'));
  }

  updateManualData() {
    this.generateSampleData();
  }

  async startTraining() {
    const data = this.trainingData();
    if (data.x.length === 0 || data.y.length === 0) {
      alert('Please provide training data first');
      return;
    }

    try {
      await this.tfjsService.train(data, this.config());
    } catch (e) {
      console.error('Training failed:', e);
      alert('Training failed: ' + (e as Error).message);
    }
  }

  stopTraining() {
    this.tfjsService.stopTraining();
  }

  async changeBackend(backend: TfjsBackend) {
    try {
      await this.tfjsService.setBackendPreference(backend);
    } catch (e) {
      console.error('Backend change failed:', e);
      alert('Backend change failed: ' + (e as Error).message);
    }
  }

  updateConfig(key: keyof TrainingConfig, value: any) {
    this.config.update((c) => ({ ...c, [key]: value }));
  }

  getProgress(): number {
    return (this.currentEpoch() / this.epochs()) * 100;
  }

  downloadModel() {
    const json = this.tfjsService.saveModel();
    if (json) {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'model.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  downloadModelCode() {
    const code = this.tfjsService.generateModelCode();
    const blob = new Blob([code], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'model.ts';
    a.click();
    URL.revokeObjectURL(url);
  }

  hasModel(): boolean {
    return !!this.tfjsService.getModel();
  }

  getChartPoints(metricKey: 'loss' | 'valLoss' | 'accuracy' | 'valAccuracy'): string {
    const metrics = this.trainingMetrics();
    if (metrics.length < 2) return '';

    const width = 300;
    const height = 150;
    const values = metrics.map((metric) => metric[metricKey] ?? 0);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;

    return values
      .map((value, index) => {
        const x = (index / (values.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        return `${x},${y}`;
      })
      .join(' ');
  }

  formatNumber(n: number | null): string {
    if (n === null) return '—';
    return n.toFixed(4);
  }
}
