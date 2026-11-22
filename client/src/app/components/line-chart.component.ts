import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input, signal } from '@angular/core';
import { Series } from '../services/stats.service';

const PAD_LEFT = 34;
const PAD_RIGHT = 8;
const PAD_TOP = 10;
const PAD_BOTTOM = 24;

function niceStep(max: number): number {
  if (max <= 5) return 1;
  if (max <= 10) return 5;
  if (max <= 40) return 10;
  if (max <= 100) return 25;
  if (max <= 200) return 50;

  const pow = Math.pow(10, Math.floor(Math.log10(max / 2)));
  return Math.ceil(max / 2 / pow) * pow;
}

/**
 * Line chart for counts over time: fills the width of its container,
 * marks the peak, crosshair + tooltip on hover / tap.
 */
@Component({
  selector: 'app-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (labels().length === 0) {
      <div class="empty" [style.height.px]="height()">Noch keine Verkäufe mit Uhrzeit</div>
    } @else {
      <svg [attr.width]="width()" [attr.height]="height()" role="img" [attr.aria-label]="ariaLabel()"
           (pointermove)="onPointer($event)" (pointerdown)="onPointer($event)" (pointerleave)="hover.set(null)">
        @if (!compact()) {
          @for (g of grid(); track g.v) {
            <line [attr.x1]="padLeft()" [attr.x2]="width() - padRight" [attr.y1]="g.y" [attr.y2]="g.y" class="grid"></line>
            <text [attr.x]="padLeft() - 6" [attr.y]="g.y + 4" text-anchor="end" class="axis">{{ g.v }}</text>
          }
        } @else {
          <line [attr.x1]="0" [attr.x2]="width()" [attr.y1]="y(0)" [attr.y2]="y(0)" class="grid"></line>
        }

        @if (peak(); as p) {
          <line [attr.x1]="x(p.index)" [attr.x2]="x(p.index)" [attr.y1]="padTop" [attr.y2]="y(0)" class="peak"></line>
        }

        @for (s of series(); track s.key) {
          <polyline [attr.points]="points(s)" fill="none" [attr.stroke]="s.color" stroke-width="2"
                    stroke-linejoin="round" stroke-linecap="round"></polyline>
        }

        @if (hover() !== null) {
          <line [attr.x1]="x(hover()!)" [attr.x2]="x(hover()!)" [attr.y1]="padTop" [attr.y2]="y(0)" class="cross"></line>
          @for (s of series(); track s.key) {
            <circle [attr.cx]="x(hover()!)" [attr.cy]="y(s.vals[hover()!])" r="5" [attr.fill]="s.color" stroke="#fff" stroke-width="2"></circle>
          }
        } @else if (peak(); as p) {
          @if (series().length === 1) {
            <circle [attr.cx]="x(p.index)" [attr.cy]="y(series()[0].vals[p.index])" r="5" [attr.fill]="series()[0].color" stroke="#fff" stroke-width="2"></circle>
          }
        }

        @if (!compact()) {
          @for (l of xLabels(); track l.i) {
            <text [attr.x]="x(l.i)" [attr.y]="height() - 6" [attr.text-anchor]="l.anchor" class="axis">{{ l.label }}</text>
          }
        }
      </svg>

      @if (hover() !== null) {
        <div class="tip" [style.left.px]="tipLeft()" aria-hidden="true">
          <span class="tip-title">{{ labels()[hover()!] }}{{ interval() > 15 ? ' (' + interval() + ' Min)' : '' }}</span>
          @for (s of series(); track s.key) {
            <span class="tip-row">
              <span class="dot" [style.background]="s.color"></span>
              <span class="tip-name">{{ s.name }}</span>
              <strong>{{ s.vals[hover()!] }}</strong>
            </span>
          }
        </div>
      }
    }
  `,
  styles: `
    :host { display: block; position: relative; width: 100%; min-width: 0; touch-action: pan-y; }
    svg { display: block; overflow: visible; cursor: crosshair; }
    .grid { stroke: #eceae4; stroke-width: 1; }
    .peak { stroke: #8a857c; stroke-width: 1; stroke-dasharray: 3 3; }
    .cross { stroke: var(--os-text); stroke-width: 1; }
    .axis { font-size: 11px; fill: var(--os-muted); font-family: var(--os-font); }
    .empty { display: flex; align-items: center; justify-content: center; font-size: 14px; color: var(--os-muted);
      background: var(--os-card-soft); border-radius: 12px; }
    .tip { position: absolute; top: 0; width: 170px; padding: 8px 10px; border-radius: 10px; background: var(--os-text);
      color: #fff; display: flex; flex-direction: column; gap: 3px; pointer-events: none; box-shadow: 0 4px 12px rgba(0,0,0,.2); z-index: 2; }
    .tip-title { font-size: 12px; font-weight: 700; }
    .tip-row { display: flex; align-items: center; gap: 6px; font-size: 12px; }
    .tip-name { flex: 1 1 auto; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .dot { width: 8px; height: 8px; border-radius: 4px; flex-shrink: 0; }
  `
})
export class LineChartComponent {

  public readonly labels = input.required<string[]>();
  public readonly series = input.required<Series[]>();
  public readonly height = input(220);
  /** minutes per bucket, only for the tooltip */
  public readonly interval = input(15);
  /** sparkline style: no y axis, no grid */
  public readonly compact = input(false);

  protected readonly padTop = PAD_TOP;
  protected readonly padRight = PAD_RIGHT;
  protected readonly width = signal(320);
  protected readonly hover = signal<number | null>(null);

  constructor() {
    const host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    const observer = new ResizeObserver(entries => {
      const w = Math.floor(entries[0].contentRect.width);
      if (w > 0) this.width.set(w);
    });

    observer.observe(host);
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }

  protected readonly padLeft = computed(() => this.compact() ? 6 : PAD_LEFT);

  private readonly max = computed(() => Math.max(0, ...this.series().flatMap(s => s.vals)));

  private readonly yMax = computed(() => {
    const max = this.max();
    const step = niceStep(max);
    return Math.max(step, Math.ceil(max / step) * step);
  });

  protected readonly grid = computed(() => {
    const yMax = this.yMax();
    return [ 0, yMax / 2, yMax ].map(v => ({ v: Math.round(v * 10) / 10, y: this.y(v) }));
  });

  protected readonly peak = computed(() => {
    const n = this.labels().length;
    if (n === 0) return null;

    const sums = Array.from({ length: n }, (_, i) => this.series().reduce((a, s) => a + (s.vals[i] ?? 0), 0));
    const max = Math.max(...sums);
    return max > 0 ? { index: sums.indexOf(max), value: max } : null;
  });

  protected readonly xLabels = computed(() => {
    const labels = this.labels();
    const n = labels.length;
    const plot = this.width() - this.padLeft() - PAD_RIGHT;
    // only full hours, at least ~56px apart
    const hours = labels.map((l, i) => ({ l, i })).filter(({ l }) => l.endsWith(':00'));
    const perLabel = n > 1 ? plot / (n - 1) : plot;
    const every = Math.max(1, Math.ceil(56 / Math.max(1, perLabel * (hours.length > 1 ? hours[1].i - hours[0].i : 1))));

    return hours
      .filter((_, k) => k % every === 0)
      .map(({ l, i }) => ({
        i,
        label: l.slice(0, 2) + ' Uhr',
        anchor: n > 1 && i === 0 ? 'start' : n > 1 && i === n - 1 ? 'end' : 'middle'
      }));
  });

  protected readonly ariaLabel = computed(() => {
    const p = this.peak();
    const names = this.series().map(s => s.name).join(', ');
    return `Liniendiagramm verkaufte Artikel über die Zeit (${ names })` + (p ? `, Peak um ${ this.labels()[p.index] } mit ${ p.value }` : '');
  });

  protected readonly tipLeft = computed(() => {
    const h = this.hover();
    if (h === null) return 0;

    const hx = this.x(h);
    const left = hx > this.width() / 2 ? hx - 180 : hx + 10;
    return Math.max(0, Math.min(this.width() - 170, left));
  });

  protected x(i: number): number {
    const n = this.labels().length;
    const plot = this.width() - this.padLeft() - PAD_RIGHT;
    return this.padLeft() + (n <= 1 ? plot / 2 : i * plot / (n - 1));
  }

  protected y(v: number): number {
    const plot = this.height() - PAD_TOP - (this.compact() ? 4 : PAD_BOTTOM);
    return PAD_TOP + plot - (v / this.yMax()) * plot;
  }

  protected points(s: Series): string {
    return s.vals.map((v, i) => `${ this.x(i).toFixed(1) },${ this.y(v).toFixed(1) }`).join(' ');
  }

  protected onPointer(event: PointerEvent): void {
    const n = this.labels().length;
    if (n === 0) return;

    const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
    const plot = this.width() - this.padLeft() - PAD_RIGHT;
    const rel = (event.clientX - rect.left - this.padLeft()) / (plot || 1);
    this.hover.set(Math.max(0, Math.min(n - 1, Math.round(rel * (n - 1)))));
  }
}
