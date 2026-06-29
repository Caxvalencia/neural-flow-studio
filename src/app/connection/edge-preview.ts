import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-edge-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './edge-preview.html',
  styleUrl: './edge-preview.scss',
})
export class EdgePreviewComponent {
  @Input({ required: true }) sourceX!: number;
  @Input({ required: true }) sourceY!: number;
  @Input({ required: true }) targetX!: number;
  @Input({ required: true }) targetY!: number;

  get pathData(): string {
    const dx = this.targetX - this.sourceX;
    const curveStrength = Math.min(Math.abs(dx) * 0.5, 100);

    const cp1x = this.sourceX + curveStrength;
    const cp1y = this.sourceY;
    const cp2x = this.targetX - curveStrength;
    const cp2y = this.targetY;

    return `M ${this.sourceX} ${this.sourceY} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${this.targetX} ${this.targetY}`;
  }
}
