import {
  Directive,
  ElementRef,
  HostBinding,
  HostListener,
  Input,
  OnDestroy,
  Renderer2,
} from '@angular/core';

@Directive({
  selector: '[title]',
  standalone: true,
})
export class TooltipDirective implements OnDestroy {
  @Input('title') tooltip = '';
  @HostBinding('attr.title') nativeTitle: string | null = null;

  private tooltipElement: HTMLElement | null = null;
  private showTimer: number | null = null;

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private renderer: Renderer2,
  ) {}

  @HostListener('mouseenter')
  @HostListener('focusin')
  show() {
    if (!this.tooltip?.trim()) return;
    this.clearShowTimer();
    this.showTimer = window.setTimeout(() => this.renderTooltip(), 180);
  }

  @HostListener('mouseleave')
  @HostListener('focusout')
  @HostListener('window:scroll')
  @HostListener('window:resize')
  hide() {
    this.clearShowTimer();
    this.destroyTooltip();
  }

  ngOnDestroy() {
    this.hide();
  }

  private renderTooltip() {
    this.destroyTooltip();

    const tooltip = this.renderer.createElement('div') as HTMLElement;
    this.renderer.addClass(tooltip, 'app-tooltip');
    this.renderer.setProperty(tooltip, 'textContent', this.tooltip);
    this.renderer.appendChild(document.body, tooltip);
    this.tooltipElement = tooltip;

    requestAnimationFrame(() => this.positionTooltip());
  }

  private positionTooltip() {
    if (!this.tooltipElement) return;

    const hostRect = this.elementRef.nativeElement.getBoundingClientRect();
    const tooltipRect = this.tooltipElement.getBoundingClientRect();
    const margin = 10;
    const viewportPadding = 12;

    const fitsAbove = hostRect.top >= tooltipRect.height + margin + viewportPadding;
    const top = fitsAbove ? hostRect.top - tooltipRect.height - margin : hostRect.bottom + margin;

    const centeredLeft = hostRect.left + hostRect.width / 2 - tooltipRect.width / 2;
    const left = Math.min(
      Math.max(centeredLeft, viewportPadding),
      window.innerWidth - tooltipRect.width - viewportPadding,
    );

    this.renderer.setStyle(this.tooltipElement, 'top', `${top}px`);
    this.renderer.setStyle(this.tooltipElement, 'left', `${left}px`);
    this.renderer.addClass(this.tooltipElement, fitsAbove ? 'above' : 'below');
    this.renderer.addClass(this.tooltipElement, 'visible');
  }

  private clearShowTimer() {
    if (this.showTimer === null) return;
    window.clearTimeout(this.showTimer);
    this.showTimer = null;
  }

  private destroyTooltip() {
    if (!this.tooltipElement) return;
    this.renderer.removeChild(document.body, this.tooltipElement);
    this.tooltipElement = null;
  }
}
