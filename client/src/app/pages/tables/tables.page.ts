import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SkeletonModule } from 'primeng/skeleton';
import { FitTextDirective } from '../../utils/fit-text.directive';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-tables',
  imports: [ FitTextDirective, RouterLink, SkeletonModule ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header large">
      <h1>Tische</h1>
      <span class="greeting">Hallo, {{ auth.firstName() }}</span>
    </header>

    <main class="page-main">
      @if (!data.loaded()) {
        @for (s of [ 1, 2, 3 ]; track s) {
          <section class="area">
            <p-skeleton width="90px" height="14px" />
            <div class="grid">
              @for (t of [ 1, 2, 3, 4 ]; track t) {
                <p-skeleton height="76px" />
              }
            </div>
          </section>
        }
      } @else {
        @for (section of data.tablesByArea(); track section.label) {
          @if (section.tables.length > 0) {
            <section class="area" [attr.aria-label]="section.label">
              <h2 class="section-title">{{ section.label }}</h2>
              <div class="grid">
                @for (table of section.tables; track table.id) {
                  @let pending = cart.pendingCountByTable().get(table.id);
                  <a class="table-tile" [class.pending]="pending" [routerLink]="['/order', table.id]"
                     [attr.aria-label]="'Tisch ' + table.nr + (pending ? ', ' + pending + ' nicht gesendet' : '')">
                    <span class="nr" appFitText>{{ table.nr }}</span>
                    @if (pending) {
                      <span class="count-badge pending-badge" aria-hidden="true">{{ pending }}</span>
                    }
                  </a>
                }
              </div>
            </section>
          }
        } @empty {
          <div class="empty">
            <i class="pi pi-th-large" aria-hidden="true"></i>
            <strong>Noch keine Tische</strong>
            <span>Ein Admin kann unter „Mehr → Tische & Bereiche“ Tische anlegen.</span>
          </div>
        }
      }
    </main>
  `,
  styles: `
    :host { display: contents; }
    .area { display: flex; flex-direction: column; gap: 8px; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
    @media (min-width: 560px) { .grid { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
    @media (min-width: 768px) {
      .page-main { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); align-content: start; column-gap: 24px; row-gap: 20px; }
      .page-main > .empty { grid-column: 1 / -1; }
      .grid { grid-template-columns: repeat(auto-fill, minmax(76px, 1fr)); gap: 10px; }
      .area { gap: 10px; }
      .table-tile:hover { border-color: var(--os-primary-strong); }
    }

    .table-tile {
      position: relative;
      height: 76px;
      border-radius: var(--os-radius);
      background: var(--os-card);
      border: 1.5px solid var(--os-border-strong);
      text-decoration: none;
      color: var(--os-text);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform .08s ease;
    }
    .table-tile:active { transform: scale(.96); background: var(--os-primary-soft); }
    .table-tile .nr { font-size: 28px; font-weight: 800; max-width: 100%; padding: 0 8px; box-sizing: border-box; white-space: nowrap; overflow: hidden; text-overflow: clip; }
    .table-tile.pending { background: var(--os-primary-soft); border: 2px solid var(--os-primary-strong); }
    .pending-badge { position: absolute; top: 6px; right: 6px; }
  `
})
export class TablesPage {
  protected readonly data = inject(DataService);
  protected readonly auth = inject(AuthService);
  protected readonly cart = inject(CartService);
}
