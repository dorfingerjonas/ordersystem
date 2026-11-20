import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SkeletonModule } from 'primeng/skeleton';
import { DataService } from '../../services/data.service';
import { eur } from '../../utils/format';

@Component({
  selector: 'app-pay-tables',
  imports: [ RouterLink, SkeletonModule ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header large">
      <div class="titles">
        <h1>Kassieren</h1>
        <span class="subtitle">
          @if (openTotal() > 0) {
            {{ openCount() }} {{ openCount() === 1 ? 'Tisch' : 'Tische' }} offen · {{ eur(openTotal()) }}
          } @else {
            Tisch wählen
          }
        </span>
      </div>
    </header>

    <main class="page-main">
      <div class="card">
        <a class="nav-row" routerLink="/pay/direct">
          <span class="nav-icon"><i class="pi pi-shopping-bag" aria-hidden="true"></i></span>
          <span class="row-main">
            <span class="row-title">Direktverkauf</span>
            <span class="row-sub">Ohne Tisch und ohne Bon sofort kassieren</span>
          </span>
          <i class="pi pi-chevron-right chev" aria-hidden="true"></i>
        </a>
      </div>

      @if (!data.loaded()) {
        <div class="grid">
          @for (i of [ 1, 2, 3, 4, 5, 6 ]; track i) {
            <p-skeleton height="76px" />
          }
        </div>
      } @else {
        @for (section of sections(); track section.label) {
          <section class="area">
            <h2 class="section-title">{{ section.label }}</h2>
            <div class="grid">
              @for (t of section.tables; track t.id) {
                <a class="table-tile" [routerLink]="['/pay', t.id]" [attr.aria-label]="'Tisch ' + t.nr + ', offen ' + eur(t.open)">
                  <span class="nr">{{ t.nr }}</span>
                  <span class="amount">{{ eur(t.open) }}</span>
                </a>
              }
            </div>
          </section>
        } @empty {
          <div class="empty">
            <i class="pi pi-check-circle" aria-hidden="true"></i>
            <strong>Alles bezahlt</strong>
            <span>Kein Tisch hat offene Beträge.</span>
          </div>
        }
      }
    </main>
  `,
  styles: `
    :host { display: contents; }
    .area { display: flex; flex-direction: column; gap: 8px; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    @media (min-width: 560px) { .grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
    .table-tile {
      height: 76px;
      border-radius: var(--os-radius);
      background: var(--os-primary-soft);
      border: 2px solid var(--os-primary-strong);
      text-decoration: none;
      color: var(--os-text);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
    }
    .table-tile:active { transform: scale(.96); }
    .nr { font-size: 24px; font-weight: 800; }
    .amount { font-size: 13px; font-weight: 700; color: var(--os-on-primary-soft); }
  `
})
export class PayTablesPage {

  protected readonly data = inject(DataService);
  protected readonly eur = eur;

  protected readonly sections = computed(() => {
    const open = this.data.openCentsByTable();

    return this.data.tablesByArea()
      .map(s => ({
        label: s.label,
        tables: s.tables
          .filter(t => (open.get(t.id) ?? 0) > 0)
          .map(t => ({ ...t, open: (open.get(t.id) ?? 0) / 100 }))
      }))
      .filter(s => s.tables.length > 0);
  });

  protected readonly openCount = computed(() => this.sections().reduce((s, sec) => s + sec.tables.length, 0));
  protected readonly openTotal = computed(() => this.sections().reduce((s, sec) => s + sec.tables.reduce((a, t) => a + t.open, 0), 0));
}
