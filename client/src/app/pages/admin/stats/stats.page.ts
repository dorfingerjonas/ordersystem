import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SkeletonModule } from 'primeng/skeleton';
import { DataService } from '../../../services/data.service';
import { buildTimeline, StatsService } from '../../../services/stats.service';
import { LineChartComponent } from '../../../components/line-chart.component';
import { StatsHeaderComponent } from './stats-header.component';
import { eur } from '../../../utils/format';

@Component({
  selector: 'app-stats',
  imports: [ RouterLink, SkeletonModule, LineChartComponent, StatsHeaderComponent ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './stats.scss',
  template: `
    <div class="screen">
      <app-stats-header title="Statistik" back="/more" backLabel="Zurück zur Verwaltung" />

      <main class="page-main">
        @if (!data.loaded()) {
          <p-skeleton height="160px" />
          <p-skeleton height="160px" />
        } @else {
          <div class="kpis">
            <div class="kpi"><span>Umsatz</span><strong>{{ eur(t().revenue) }}</strong></div>
            <div class="kpi"><span>Artikel verkauft</span><strong>{{ t().items }}</strong></div>
            <div class="kpi"><span>Bestellungen</span><strong>{{ t().orders }}</strong></div>
            <div class="kpi"><span>Ø pro Bestellung</span><strong>{{ eur(t().avgOrder) }}</strong></div>
          </div>

          <div class="stat-card money">
            <div><span class="swatch" style="background: var(--os-success)"></span>Kassiert <strong>{{ eur(t().cashed) }}</strong></div>
            <div><span class="swatch" style="background: var(--os-primary-strong)"></span>Aktuell offen <strong>{{ eur(t().open) }}</strong></div>
            @if (t().directItems > 0) {
              <div><span class="swatch" style="background: var(--os-faint)"></span>Direktverkauf <strong>{{ eur(t().directRevenue) }}</strong></div>
            }
          </div>

          <div class="grid">
            <a class="stat-card link" routerLink="/admin/stats/timeline">
              <span class="head"><span class="card-title">Verkaufte Artikel pro 15 Min</span><i class="pi pi-chevron-right" aria-hidden="true"></i></span>
              @if (peak(); as p) {
                <span class="card-sub">Peak um <strong>{{ p.label }}</strong> mit {{ p.value }} Artikeln</span>
              }
              <app-line-chart [labels]="timeline().labels" [series]="timeline().series" [height]="96" [compact]="true" />
              @if (timeline().labels.length > 0) {
                <span class="ends"><span>{{ timeline().labels[0] }}</span><span>{{ timeline().labels[timeline().labels.length - 1] }}</span></span>
              }
            </a>

            <section class="stat-card top">
              <h2>Top 3 Produkte</h2>
              @for (p of top(); track p.key; let i = $index) {
                <div class="top-row">
                  <span class="rank">{{ i + 1 }}</span>
                  <span class="name">{{ p.name }}</span>
                  <strong>{{ p.qty }}×</strong>
                </div>
              } @empty {
                <span class="card-sub">Noch nichts verkauft.</span>
              }
            </section>
          </div>

          <nav class="card links" aria-label="Statistiken">
            @for (l of links; track l.href) {
              <a class="nav-row" [routerLink]="l.href">
                <span class="nav-icon"><i [class]="'pi ' + l.icon" aria-hidden="true"></i></span>
                <span class="row-main">
                  <span class="row-title">{{ l.title }}</span>
                  <span class="row-sub">{{ l.sub }}</span>
                </span>
                <i class="pi pi-chevron-right chev" aria-hidden="true"></i>
              </a>
            }
          </nav>
        }
      </main>
    </div>
  `,
  styles: `
    :host { --os-page-max: 1120px; }
    .kpis { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .kpi { background: var(--os-card); border: 1px solid var(--os-border); border-radius: var(--os-radius-lg);
      padding: 12px 14px; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .kpi span { font-size: 13px; font-weight: 600; color: var(--os-muted); }
    .kpi strong { font-size: 24px; font-weight: 800; letter-spacing: -0.3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .money { flex-direction: row; flex-wrap: wrap; gap: 8px 20px; font-size: 14px; color: var(--os-text-2); padding: 12px 14px; }
    .money div { display: flex; align-items: center; gap: 6px; }
    .money strong { color: var(--os-text); }
    .grid { display: flex; flex-direction: column; gap: 14px; }
    .link { text-decoration: none; color: var(--os-text); cursor: pointer; }
    .link .head { display: flex; justify-content: space-between; align-items: center; }
    .link .head i { color: var(--os-faint); }
    .ends { display: flex; justify-content: space-between; font-size: 11px; color: var(--os-muted); }
    .top { gap: 0; padding-bottom: 4px; }
    .top h2 { padding-bottom: 6px; }
    .top-row { min-height: 44px; display: flex; align-items: center; gap: 10px; border-top: 1px solid var(--os-divider); font-size: 15px; }
    .top-row .rank { width: 20px; font-weight: 800; color: var(--os-muted); }
    .top-row .name { flex: 1 1 auto; font-weight: 600; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    @media (min-width: 768px) {
      .kpis { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
      .grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 16px; }
      .links { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .links .nav-row:nth-last-child(2) { border-bottom: none; }
      .links .nav-row:nth-child(odd) { border-right: 1px solid var(--os-divider); }
    }
  `
})
export class StatsPage {

  protected readonly data = inject(DataService);
  protected readonly stats = inject(StatsService);

  protected readonly eur = eur;
  protected readonly t = this.stats.totals;

  protected readonly timeline = computed(() => buildTimeline(this.stats.sales(), 15, [
    { key: 'all', name: 'Alle Produkte', color: '#2a78d6', match: () => true }
  ]));

  protected readonly peak = computed(() => {
    const { labels, series } = this.timeline();
    const vals = series[0]?.vals ?? [];
    const max = Math.max(0, ...vals);
    return max > 0 ? { label: labels[vals.indexOf(max)], value: max } : null;
  });

  protected readonly top = computed(() => this.stats.productStats().slice(0, 3));

  protected readonly links = [
    { title: 'Produkte', sub: 'Was wurde wie oft verkauft?', href: '/admin/stats/products', icon: 'pi-box' },
    { title: 'Verlauf', sub: 'Wann waren die Peaks? Nach Produkt filtern', href: '/admin/stats/timeline', icon: 'pi-chart-line' },
    { title: 'Kellner', sub: 'Bestellt und kassiert pro Person', href: '/admin/stats/waiters', icon: 'pi-users' },
    { title: 'Tische & Kategorien', sub: 'Umsatz pro Tisch und Kategorie', href: '/admin/stats/tables', icon: 'pi-th-large' }
  ];
}
