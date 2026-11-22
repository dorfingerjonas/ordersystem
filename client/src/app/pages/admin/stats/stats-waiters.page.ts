import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { StatsService } from '../../../services/stats.service';
import { StatsHeaderComponent } from './stats-header.component';
import { eur } from '../../../utils/format';

const ORDERED = '#2a78d6';
const CASHED = '#eb6834';

@Component({
  selector: 'app-stats-waiters',
  imports: [ StatsHeaderComponent ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './stats.scss',
  template: `
    <div class="screen">
      <app-stats-header title="Kellner" />

      <main class="page-main">
        <div class="bar">
          <div class="legend">
            <span><span class="swatch" [style.background]="ordered"></span>Bestellt</span>
            <span><span class="swatch" [style.background]="cashed"></span>Kassiert</span>
          </div>
          <div class="seg-inline small" role="group" aria-label="Sortierung">
            <button type="button" [attr.aria-pressed]="sort() === 'ordered'" (click)="sort.set('ordered')">Bestellt</button>
            <button type="button" [attr.aria-pressed]="sort() === 'cashed'" (click)="sort.set('cashed')">Kassiert</button>
          </div>
        </div>

        <div class="list">
          @for (w of waiters(); track w.name; let i = $index) {
            <section class="stat-card">
              <div class="w-head">
                <span class="avatar" aria-hidden="true">{{ w.name.charAt(0) }}</span>
                <h2>{{ w.name }}</h2>
                <span class="rank">#{{ i + 1 }}</span>
              </div>
              <div class="bars">
                <span class="lbl">Bestellt</span>
                <div class="bar-track thick"><div class="bar-fill" [style.width.%]="w.oPct" [style.background]="ordered"></div></div>
                <strong>{{ eur(w.ordered) }}</strong>
                <span class="lbl">Kassiert</span>
                <div class="bar-track thick"><div class="bar-fill" [style.width.%]="w.cPct" [style.background]="cashed"></div></div>
                <strong>{{ eur(w.cashed) }}</strong>
              </div>
              <div class="facts">
                <span><span class="lbl">Bestellungen</span><strong>{{ w.orders }}</strong></span>
                <span><span class="lbl">Artikel</span><strong>{{ w.items }}</strong></span>
                <span><span class="lbl">Ø Bestellung</span><strong>{{ w.orders ? eur(w.ordered / w.orders) : '–' }}</strong></span>
              </div>
            </section>
          } @empty {
            <div class="card empty-state"><i class="pi pi-users" aria-hidden="true"></i>Keine Verkäufe in diesem Zeitraum.</div>
          }
        </div>
      </main>
    </div>
  `,
  styles: `
    :host { --os-page-max: 1120px; }
    .bar { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
    .list { display: flex; flex-direction: column; gap: 10px; }
    .w-head { display: flex; align-items: center; gap: 10px; }
    .w-head h2 { flex: 1 1 auto; font-size: 17px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .avatar { width: 36px; height: 36px; border-radius: 18px; background: var(--os-primary-soft); color: var(--os-on-primary-soft);
      font-size: 14px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .rank { font-size: 12px; font-weight: 700; color: var(--os-muted); }
    .bars { display: grid; grid-template-columns: 62px 1fr auto; gap: 6px 8px; align-items: center; }
    .bars strong { font-size: 14px; text-align: right; min-width: 78px; }
    .thick { height: 12px; }
    .lbl { font-size: 13px; color: var(--os-text-2); }
    .facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; border-top: 1px solid var(--os-divider); padding-top: 10px; }
    .facts > span { display: flex; flex-direction: column; }
    .facts .lbl { font-size: 12px; color: var(--os-muted); }
    .facts strong { font-size: 15px; }
    @media (min-width: 768px) {
      .list { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 14px; }
    }
  `
})
export class StatsWaitersPage {

  protected readonly stats = inject(StatsService);

  protected readonly eur = eur;
  protected readonly ordered = ORDERED;
  protected readonly cashed = CASHED;
  protected readonly sort = signal<'ordered' | 'cashed'>('ordered');

  protected readonly waiters = computed(() => {
    const list = [ ...this.stats.waiterStats() ];
    const key = this.sort();
    const max = Math.max(1, ...list.map(w => Math.max(w.ordered, w.cashed)));

    return list
      .sort((a, b) => b[key] - a[key] || a.name.localeCompare(b.name))
      .map(w => ({ ...w, oPct: Math.round(w.ordered / max * 100), cPct: Math.round(w.cashed / max * 100) }));
  });
}
