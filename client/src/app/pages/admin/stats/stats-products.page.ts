import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { StatsService } from '../../../services/stats.service';
import { StatsHeaderComponent } from './stats-header.component';
import { eur } from '../../../utils/format';

@Component({
  selector: 'app-stats-products',
  imports: [ StatsHeaderComponent ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './stats.scss',
  template: `
    <div class="screen">
      <app-stats-header title="Produkte" />

      <div class="filters">
        <div class="seg-inline" role="group" aria-label="Sortierung">
          <button type="button" [attr.aria-pressed]="mode() === 'qty'" (click)="mode.set('qty')">Nach Menge</button>
          <button type="button" [attr.aria-pressed]="mode() === 'revenue'" (click)="mode.set('revenue')">Nach Umsatz</button>
        </div>
        <div class="chip-row" role="group" aria-label="Kategorie">
          <button type="button" class="chip" [attr.aria-pressed]="category() === null" (click)="category.set(null)">Alle</button>
          @for (c of stats.categoryStats(); track c.id) {
            <button type="button" class="chip" [attr.aria-pressed]="category() === c.id" (click)="category.set(c.id)">{{ c.name }}</button>
          }
        </div>
      </div>

      <main class="page-main">
        <section class="card list">
          @for (r of rows(); track r.key) {
            <div class="item">
              <div class="item-head">
                <span class="name"><span class="rank">{{ r.rank }}.</span> {{ r.name }}</span>
                <strong>{{ r.value }}</strong>
              </div>
              <div class="bar-track"><div class="bar-fill" [style.width.%]="r.pct" style="background: #2a78d6"></div></div>
              <span class="sub">{{ r.sub }}</span>
            </div>
          } @empty {
            <div class="empty-state"><i class="pi pi-box" aria-hidden="true"></i>Keine Verkäufe in diesem Zeitraum.</div>
          }
        </section>
      </main>
    </div>
  `,
  styles: `
    :host { --os-page-max: 860px; }
    .filters { flex-shrink: 0; padding: 0 var(--os-pad) 10px; display: flex; flex-direction: column; gap: 8px; }
    .list { padding: 6px 0; }
    .item { padding: 8px 14px; display: flex; flex-direction: column; gap: 5px; }
    .item-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; font-size: 14px; }
    .item-head .name { font-weight: 600; min-width: 0; }
    .item-head strong { white-space: nowrap; }
    .rank { color: var(--os-muted); font-weight: 700; }
    .sub { font-size: 12px; color: var(--os-muted); }
  `
})
export class StatsProductsPage {

  protected readonly stats = inject(StatsService);

  protected readonly mode = signal<'qty' | 'revenue'>('qty');
  protected readonly category = signal<number | null>(null);

  protected readonly rows = computed(() => {
    const all = this.stats.productStats();
    const totalQty = all.reduce((a, p) => a + p.qty, 0) || 1;
    const totalCents = all.reduce((a, p) => a + p.cents, 0) || 1;
    const byQty = this.mode() === 'qty';
    const category = this.category();

    const list = all
      .filter(p => category === null || p.category === category)
      .sort((a, b) => byQty ? b.qty - a.qty || b.cents - a.cents : b.cents - a.cents || b.qty - a.qty);

    const max = list.length ? (byQty ? list[0].qty : list[0].cents) || 1 : 1;

    return list.map((p, i) => {
      const v = byQty ? p.qty : p.cents;
      return {
        key: p.key,
        rank: i + 1,
        name: p.name,
        pct: Math.max(2, Math.round(v / max * 100)),
        value: byQty ? `${ p.qty }×` : eur(p.cents / 100),
        sub: byQty
          ? `${ eur(p.cents / 100) } Umsatz, ${ Math.round(p.qty / totalQty * 100) } % aller Artikel`
          : `${ p.qty }× verkauft, ${ Math.round(p.cents / totalCents * 100) } % vom Umsatz`
      };
    });
  });
}
