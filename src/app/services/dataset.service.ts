import { Injectable } from '@angular/core';

import { TrainingData } from './tfjs.service';

export interface DatasetDefinition {
  id: string;
  name: string;
  description: string;
  source: string;
  imageShape: number[];
  outputClasses: number;
  defaultSamples: number;
  maxSamples: number;
  template: 'cnn-classifier';
  splitOffset: number;
}

export interface LoadedDataset {
  definition: DatasetDefinition;
  data: TrainingData;
}

const MNIST_IMAGE_WIDTH = 28;
const MNIST_IMAGE_HEIGHT = 28;
const MNIST_IMAGE_SIZE = MNIST_IMAGE_WIDTH * MNIST_IMAGE_HEIGHT;
const MNIST_CLASSES = 10;
const MNIST_TRAIN_ELEMENTS = 55000;
const MNIST_TEST_ELEMENTS = 10000;
const MNIST_IMAGES_SPRITE_PATH =
  'https://storage.googleapis.com/learnjs-data/model-builder/mnist_images.png';
const MNIST_LABELS_PATH =
  'https://storage.googleapis.com/learnjs-data/model-builder/mnist_labels_uint8';

@Injectable({ providedIn: 'root' })
export class DatasetService {
  readonly datasets: DatasetDefinition[] = [
    {
      id: 'mnist-train',
      name: 'MNIST digits - train',
      description: 'Digitos manuscritos 28x28 en escala de grises, labels one-hot de 0 a 9.',
      source: 'TensorFlow.js examples',
      imageShape: [28, 28, 1],
      outputClasses: 10,
      defaultSamples: 1000,
      maxSamples: MNIST_TRAIN_ELEMENTS,
      template: 'cnn-classifier',
      splitOffset: 0,
    },
    {
      id: 'mnist-test',
      name: 'MNIST digits - test',
      description: 'Split de prueba de MNIST para validaciones rapidas con la misma forma 28x28x1.',
      source: 'TensorFlow.js examples',
      imageShape: [28, 28, 1],
      outputClasses: 10,
      defaultSamples: 1000,
      maxSamples: MNIST_TEST_ELEMENTS,
      template: 'cnn-classifier',
      splitOffset: MNIST_TRAIN_ELEMENTS,
    },
  ];

  async loadDataset(datasetId: string, samples: number): Promise<LoadedDataset> {
    const definition = this.datasets.find((dataset) => dataset.id === datasetId);
    if (!definition) throw new Error(`Unknown dataset: ${datasetId}`);

    const normalizedSamples = Math.max(1, Math.min(samples, definition.maxSamples));
    const [images, labels] = await Promise.all([
      this.loadMnistImages(definition.splitOffset, normalizedSamples),
      this.loadMnistLabels(definition.splitOffset, normalizedSamples),
    ]);

    return {
      definition,
      data: { x: images, y: labels },
    };
  }

  private async loadMnistImages(offset: number, samples: number): Promise<number[][]> {
    const image = await this.loadImage(MNIST_IMAGES_SPRITE_PATH);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas 2D is not available in this browser.');

    canvas.width = image.naturalWidth;
    canvas.height = samples;
    context.drawImage(
      image,
      0,
      offset,
      image.naturalWidth,
      samples,
      0,
      0,
      image.naturalWidth,
      samples,
    );

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const rows: number[][] = Array.from({ length: samples }, () => new Array(MNIST_IMAGE_SIZE));

    for (let sampleIndex = 0; sampleIndex < samples; sampleIndex++) {
      const rowOffset = sampleIndex * MNIST_IMAGE_SIZE;
      for (let pixelIndex = 0; pixelIndex < MNIST_IMAGE_SIZE; pixelIndex++) {
        rows[sampleIndex][pixelIndex] = imageData[(rowOffset + pixelIndex) * 4] / 255;
      }
    }

    return rows;
  }

  private async loadMnistLabels(offset: number, samples: number): Promise<number[][]> {
    const response = await fetch(MNIST_LABELS_PATH);
    if (!response.ok) throw new Error(`Failed to load MNIST labels: ${response.status}`);

    const labels = new Uint8Array(await response.arrayBuffer());
    const rows: number[][] = [];

    for (let sampleIndex = 0; sampleIndex < samples; sampleIndex++) {
      const start = (offset + sampleIndex) * MNIST_CLASSES;
      rows.push(Array.from(labels.slice(start, start + MNIST_CLASSES)));
    }

    return rows;
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Failed to load image dataset: ${src}`));
      image.src = src;
    });
  }
}
