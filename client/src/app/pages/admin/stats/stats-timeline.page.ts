import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DrawerModule } from 'primeng/drawer';
import { buildTimeline, Sale, SERIES_COLORS, StatsService } from '../../../services/stats.service';
import { LineChartComponent } from '../../../components/line-chart.component';
import { StatsHeaderComponent } from './stats-header.component';

type Mode = 'total' | 'categories' | 'products';

const MAX_PRODUCTS = 6;

@Component({
  selector: 'app-stats-timeline',
  imports: [ FormsModule, DrawerModule, LineChartComponent, StatsHeaderComponent ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './stats.scss',
  template: `
    <div class="screen">
      <app-stats-header title="Verlauf" />

      <main class="page-main">
        <div class="seg-inline" role="group" aria-label="Darstellung">
          <button type="button" [attr.aria-pressed]="mode() === 'total'" (click)="setMode('total')">Gesamt</button>
          <button type="button" [attr.aria-pressed]="mode() === 'categories'" (click)="setMode('categories')">Kategorien</button>
          <button type="button" [attr.aria-pressed]="mode() === 'products'" (click)="setMode('products')">Produkte</button>
        </div>

        @if (mode() === 'products') {
          <section class="stat-card">
            <div class="sel-head">
              <span class="card-title">Im Diagramm</span>
              <span class="card-sub">{{ selected().length }} von max. {{ max }}</span>
            </div>
            <div class="chips">
              @for (p of selectedChips(); track p.id) {
                <button type="button" class="chip sel" (click)="toggle(p.id)" [attr.aria-label]="p.name + ' entfernen'">
                  <span class="dot" [style.background]="p.color"></span>{{ p.name }}
                  <i class="pi pi-times" aria-hidden="true"></i>
                </button>
              }
              @if (selected().length < max) {
                <button type="button" class="chip on" (click)="pickerOpen.set(true)">+ Produkt wählen</button>
              }
            </div>
            <div class="quick">
              <span>Schnell:</span>
              <button type="button" class="mini" (click)="setTop(3)">Top 3</button>
              <button type="button" class="mini" (click)="setTop(6)">Top 6</button>
              <button type="button" class="mini" (click)="selected.set([])">Leeren</button>
            </div>
          </section>
        }

        <section class="stat-card chart-card">
          <div class="chart-head">
            <span class="card-title">Artikel pro {{ interval() === 60 ? 'Stunde' : interval() + ' Min' }}</span>
            <div class="seg-inline small" role="group" aria-label="Intervall">
              @for (iv of intervals; track iv) {
                <button type="button" [attr.aria-pressed]="interval() === iv" (click)="interval.set(iv)">{{ iv }} Min</button>
              }
            </div>
          </div>
          @if (peak(); as p) {
            <span class="card-sub">Peak um <strong>{{ p.label }}</strong> mit {{ p.value }} Artikeln{{ isAll() ? ' (alle Tage nach Uhrzeit zusammengezählt)' : '' }}</span>
          }
          @if (timeline().series.length > 1) {
            <div class="legend">
              @for (s of timeline().series; track s.key) {
                <span><span class="swatch" [style.background]="s.color"></span>{{ s.name }}</span>
              }
            </div>
          }
          <app-line-chart [labels]="timeline().labels" [series]="timeline().series" [interval]="interval()" [height]="240" />
        </section>

        <button type="button" class="btn-ghost table-toggle" (click)="showTable.set(!showTable())">
          {{ showTable() ? 'Tabelle ausblenden' : 'Als Tabelle anzeigen' }}
        </button>

        @if (showTable()) {
          <section class="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Zeit</th>
                  @for (s of timeline().series; track s.key) {
                    <th scope="col">{{ s.name }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (r of tableRows(); track r.label) {
                  <tr>
                    <th scope="row">{{ r.label }}</th>
                    @for (v of r.vals; track $index) {
                      <td>{{ v }}</td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </section>
        }
      </main>
    </div>

    <p-drawer [visible]="pickerOpen()" (visibleChange)="pickerOpen.set($event)" position="bottom" styleClass="picker-drawer"
              [modal]="true" header="Produkte wählen">
      <div class="picker">
        <span class="card-sub">{{ selected().length }} von max. {{ max }} gewählt, sortiert nach Verkäufen</span>
        <input type="search" class="search" placeholder="Produkt suchen" aria-label="Produkt suchen"
               [ngModel]="query()" (ngModelChange)="query.set($event)">
        <div class="chip-row" role="group" aria-label="Kategorie">
          <button type="button" class="chip" [attr.aria-pressed]="pickCategory() === null" (click)="pickCategory.set(null)">Alle</button>
          @for (c of stats.categoryStats(); track c.id) {
            <button type="button" class="chip" [attr.aria-pressed]="pickCategory() === c.id" (click)="pickCategory.set(c.id)">{{ c.name }}</button>
          }
        </div>
        <div class="card pick-list">
          @for (p of pickList(); track p.key) {
            <button type="button" class="pick" [class.on]="p.on" [attr.aria-pressed]="p.on" [disabled]="p.disabled"
                    (click)="toggle(p.productId)">
              <span class="box" [style.background]="p.on ? p.color : null" [class.checked]="p.on">
                @if (p.on) { <i class="pi pi-check" aria-hidden="true"></i> }
              </span>
              <span class="pick-name">{{ p.name }}</span>
              <span class="card-sub">{{ p.qty }}×</span>
            </button>
          } @empty {
            <div class="empty-state">Kein Produkt gefunden.</div>
          }
        </div>
        <button type="button" class="cta dark" (click)="pickerOpen.set(false)">Fertig</button>
      </div>
    </p-drawer>
  `,
  styles: `
    :host { --os-page-max: 1000px; }
    .sel-head, .chart-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
    .chip.sel { min-height: 38px; font-size: 13px; }
    .chip.sel i { font-size: 11px; color: var(--os-text-2); }
    .chip.on { min-height: 38px; font-size: 13px; }
    .dot { width: 12px; height: 12px; border-radius: 6px; flex-shrink: 0; }
    .quick { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 12px; color: var(--os-muted); }
    .mini { height: 34px; padding: 0 10px; border-radius: 8px; border: 1.5px solid var(--os-border-strong); background: var(--os-card);
      font-size: 12px; font-weight: 600; color: var(--os-text); cursor: pointer; }
    .chart-card { padding: 14px 12px 10px; }
    .table-toggle { min-height: 44px; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 6px 12px; text-align: right; border-top: 1px solid var(--os-divider); white-space: nowrap; }
    thead th { background: var(--os-card-soft); font-size: 12px; color: var(--os-text-2); border-top: none; }
    th:first-child { text-align: left; }
    tbody th { font-weight: 600; }
    .picker { display: flex; flex-direction: column; gap: 10px; }
    .search { height: 46px; padding: 0 14px; border-radius: 12px; border: 1.5px solid var(--os-border); background: var(--os-card);
      font-family: inherit; color: var(--os-text); }
    .pick-list { max-height: 50vh; overflow-y: auto; }
    .pick { width: 100%; min-height: 52px; border: none; border-bottom: 1px solid var(--os-divider); background: var(--os-card);
      padding: 0 14px; display: flex; align-items: center; gap: 12px; color: var(--os-text); text-align: left; cursor: pointer; font-size: 15px; }
    .pick:last-child { border-bottom: none; }
    .pick.on { background: var(--os-primary-soft); font-weight: 700; }
    .pick:disabled { opacity: .45; cursor: default; }
    .pick-name { flex: 1 1 auto; min-width: 0; }
    .box { width: 24px; height: 24px; border-radius: 7px; border: 2px solid var(--os-faint); display: flex; align-items: center;
      justify-content: center; color: #fff; flex-shrink: 0; }
    .box.checked { border: none; }
    .box i { font-size: 13px; font-weight: 700; }
    .cta.dark { background: var(--os-text); height: 52px; font-size: 16px; }
    :host ::ng-deep .picker-drawer { height: auto !important; max-height: 90dvh; border-radius: 22px 22px 0 0; width: 100%; max-width: 720px; left: 0 !important; right: 0 !important; margin-left: auto !important; margin-right: auto !important; }
  `
})
export class StatsTimelinePage {

  protected readonly stats = inject(StatsService);

  protected readonly max = MAX_PRODUCTS;
  protected readonly intervals = [ 15, 30, 60 ];

  protected readonly mode = signal<Mode>('total');
  protected readonly interval = signal(15);
  /** selected products; the slot picks the color and stays when others are removed */
  protected readonly selected = signal<{ id: number | null; slot: number }[]>([]);
  protected readonly showTable = signal(false);
  protected readonly pickerOpen = signal(false);
  protected readonly query = signal('');
  protected readonly pickCategory = signal<number | null>(null);

  protected readonly isAll = computed(() => this.stats.days().length > 1);

  private readonly colorOf = computed(() => {
    // the color sticks to the slot a product was added to, removing another doesn't repaint it
    const map = new Map<number | null, string>();
    this.selected().forEach(({ id, slot }) => map.set(id, SERIES_COLORS[slot]));
    return map;
  });

  protected readonly selectedChips = computed(() => {
    const products = new Map(this.stats.productStats().map(p => [ p.productId, p.name ]));
    return this.selected().map(({ id }) => ({ id, name: products.get(id) ?? 'Produkt', color: this.colorOf().get(id)! }));
  });

  protected readonly timeline = computed(() => {
    const sales = this.stats.sales();
    const interval = this.interval();

    switch (this.mode()) {
      case 'categories':
        return buildTimeline(sales, interval, this.stats.categoryStats().map(c => ({
          key: `c${ c.id }`, name: c.name, color: c.color, match: (s: Sale) => s.category === c.id
        })));
      case 'products':
        if (this.selected().length > 0) {
          return buildTimeline(sales, interval, this.selectedChips().map(p => ({
            key: `p${ p.id }`, name: p.name, color: p.color, match: (s: Sale) => s.productId === p.id
          })));
        }
        break;
    }

    return buildTimeline(sales, interval, [ { key: 'all', name: 'Alle Produkte', color: '#1a1a1a', match: () => true } ]);
  });

  protected readonly peak = computed(() => {
    const { labels, series } = this.timeline();
    const sums = labels.map((_, i) => series.reduce((a, s) => a + s.vals[i], 0));
    const max = Math.max(0, ...sums);
    return max > 0 ? { label: labels[sums.indexOf(max)], value: max } : null;
  });

  protected readonly tableRows = computed(() => {
    const { labels, series } = this.timeline();
    return labels
      .map((label, i) => ({ label, vals: series.map(s => s.vals[i]) }))
      .filter(r => r.vals.some(v => v > 0));
  });

  protected readonly pickList = computed(() => {
    const q = this.query().trim().toLowerCase();
    const category = this.pickCategory();
    const selected = this.selected();
    const full = selected.length >= MAX_PRODUCTS;

    return this.stats.productStats()
      .filter(p => (category === null || p.category === category) && (!q || p.name.toLowerCase().includes(q)))
      .map(p => {
        const on = selected.some(s => s.id === p.productId);
        return { ...p, on, disabled: !on && full, color: this.colorOf().get(p.productId) ?? null };
      });
  });

  protected setMode(mode: Mode): void {
    this.mode.set(mode);

    if (mode === 'products' && this.selected().length === 0) this.setTop(3);
  }

  protected setTop(count: number): void {
    this.selected.set(this.stats.productStats().slice(0, count).map((p, slot) => ({ id: p.productId, slot })));
    this.mode.set('products');
  }

  protected toggle(id: number | null): void {
    const current = this.selected();

    if (current.some(s => s.id === id)) {
      this.selected.set(current.filter(s => s.id !== id));
    } else if (current.length < MAX_PRODUCTS) {
      const used = new Set(current.map(s => s.slot));
      const slot = SERIES_COLORS.findIndex((_, i) => !used.has(i));
      this.selected.set([ ...current, { id, slot } ]);
    }
  }
}
