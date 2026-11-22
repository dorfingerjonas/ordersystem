import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DataService } from '../../../services/data.service';
import { BLUE_RAMP, StatsService } from '../../../services/stats.service';
import { StatsHeaderComponent } from './stats-header.component';
import { eur } from '../../../utils/format';

@Component({
  selector: 'app-stats-tables',
  imports: [ StatsHeaderComponent ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './stats.scss',
  template: `
    <div class="screen">
      <app-stats-header title="Tische & Kategorien" />

      <main class="page-main">
        <div class="cols">
          <section class="stat-card">
            <h2>Umsatz nach Kategorie</h2>
            @if (categories().length > 0) {
              <div class="stack" role="img" [attr.aria-label]="stackLabel()">
                @for (c of categories(); track c.id) {
                  <div class="stack-seg" [style.flex-grow]="c.revenue" [style.background]="c.color"></div>
                }
              </div>
              <div class="cat-list">
                @for (c of categories(); track c.id) {
                  <div class="cat">
                    <span class="swatch" [style.background]="c.color"></span>
                    <span class="cat-name">{{ c.name }}</span>
                    <strong>{{ c.pct }} %</strong>
                    <span class="cat-val">{{ eur(c.revenue) }}</span>
                  </div>
                }
              </div>
            } @else {
              <span class="card-sub">Keine Verkäufe in diesem Zeitraum.</span>
            }
          </section>

          <section class="stat-card">
            <div class="heat-head">
              <h2>Umsatz pro Tisch</h2>
              <span class="scale" aria-hidden="true">wenig<span class="ramp"></span>viel</span>
            </div>
            @for (a of areas(); track a.label) {
              <div class="area">
                <span class="area-name">{{ a.label }}</span>
                <div class="tables">
                  @for (t of a.tables; track t.id) {
                    <div class="t" [style.background]="t.bg" [style.color]="t.fg" [attr.title]="'Tisch ' + t.nr + ': ' + t.value"
                         [attr.aria-label]="'Tisch ' + t.nr + ': ' + t.value" role="img">
                      <span class="nr">{{ t.nr }}</span>
                      <span class="val">{{ t.short }}</span>
                    </div>
                  }
                </div>
              </div>
            }
            @if (direct() > 0) {
              <span class="card-sub">Direktverkauf ohne Tisch: <strong>{{ eur(direct()) }}</strong></span>
            }
          </section>
        </div>

        @if (topTables().length > 0) {
          <section class="card">
            <div class="card-head">Umsatzstärkste Tische</div>
            @for (t of topTables(); track t.id; let i = $index) {
              <div class="row">
                <span class="rank">{{ i + 1 }}.</span>
                <span class="row-main"><span class="row-title">Tisch {{ t.nr }}</span><span class="row-sub">{{ t.area }}</span></span>
                <strong>{{ eur(t.revenue) }}</strong>
              </div>
            }
          </section>
        }
      </main>
    </div>
  `,
  styles: `
    :host { --os-page-max: 1120px; }
    .cols { display: flex; flex-direction: column; gap: 14px; }
    .stack { display: flex; gap: 2px; height: 16px; }
    .stack-seg { flex-basis: 0; min-width: 2px; height: 16px; }
    .stack-seg:first-child { border-radius: 4px 0 0 4px; }
    .stack-seg:last-child { border-radius: 0 4px 4px 0; }
    .stack-seg:only-child { border-radius: 4px; }
    .cat-list { display: flex; flex-direction: column; gap: 6px; }
    .cat { display: flex; align-items: center; gap: 8px; font-size: 14px; }
    .cat-name { flex: 1 1 auto; min-width: 0; }
    .cat-val { width: 96px; text-align: right; color: var(--os-text-2); }
    .heat-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
    .scale { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--os-muted); }
    .ramp { width: 60px; height: 8px; border-radius: 4px; background: linear-gradient(90deg, #cde2fb, #104281); }
    .area { display: flex; align-items: center; gap: 8px; }
    .area-name { width: 64px; flex-shrink: 0; font-size: 12px; font-weight: 700; color: var(--os-muted); }
    .tables { flex: 1 1 auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(56px, 1fr)); gap: 2px; }
    .t { height: 44px; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .t .nr { font-size: 13px; font-weight: 800; }
    .t .val { font-size: 10px; font-weight: 600; }
    .rank { width: 24px; font-weight: 800; color: var(--os-muted); }
    @media (min-width: 900px) {
      .cols { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 3fr); align-items: start; gap: 16px; }
    }
  `
})
export class StatsTablesPage {

  private readonly data = inject(DataService);
  protected readonly stats = inject(StatsService);

  protected readonly eur = eur;

  protected readonly categories = computed(() => {
    const list = this.stats.categoryStats().filter(c => c.revenue > 0);
    const total = list.reduce((a, c) => a + c.revenue, 0) || 1;
    return list.map(c => ({ ...c, pct: Math.round(c.revenue / total * 100) }));
  });

  protected readonly stackLabel = computed(() =>
    'Umsatzanteile: ' + this.categories().map(c => `${ c.name } ${ c.pct } %`).join(', '));

  protected readonly direct = computed(() => (this.stats.tableRevenue().get(null) ?? 0) / 100);

  protected readonly areas = computed(() => {
    const revenue = this.stats.tableRevenue();
    const values = this.data.tables().map(t => revenue.get(t.id) ?? 0);
    const max = Math.max(1, ...values);

    return this.data.tablesByArea().map(section => ({
      label: section.label,
      tables: section.tables.map(t => {
        const cents = revenue.get(t.id) ?? 0;
        const step = cents === 0 ? -1 : Math.min(BLUE_RAMP.length - 1, Math.floor(cents / max * BLUE_RAMP.length));

        return {
          id: t.id,
          nr: t.nr,
          value: eur(cents / 100),
          short: cents === 0 ? '–' : `${ Math.round(cents / 100) } €`,
          bg: step < 0 ? 'var(--os-card-soft)' : BLUE_RAMP[step],
          fg: step >= 3 ? '#ffffff' : step < 0 ? 'var(--os-faint)' : '#0d366b'
        };
      })
    })).filter(a => a.tables.length > 0);
  });

  protected readonly topTables = computed(() => {
    const revenue = this.stats.tableRevenue();
    const areas = new Map(this.data.areas().map(a => [ a.id, a.name ]));

    return this.data.tables()
      .map(t => ({ id: t.id, nr: t.nr, area: t.area !== null ? areas.get(t.area) ?? '' : '', revenue: (revenue.get(t.id) ?? 0) / 100 }))
      .filter(t => t.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  });
}
