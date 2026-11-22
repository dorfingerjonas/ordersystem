import { ChangeDetectionStrategy, Component, DestroyRef, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../../services/data.service';
import { StatsService } from '../../../services/stats.service';

/** header of every statistics page: back, title, refresh */
@Component({
  selector: 'app-stats-header',
  imports: [ RouterLink ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <a class="icon-btn" [routerLink]="back()" [attr.aria-label]="backLabel()">
        <i class="pi pi-chevron-left" aria-hidden="true"></i>
      </a>
      <div class="titles">
        <h1>{{ title() }}</h1>
        <span class="subtitle">{{ stats.periodSubtitle() }}</span>
      </div>
      <button type="button" class="icon-btn" (click)="refresh()" aria-label="Aktualisieren"
              [disabled]="stats.ordersLoading() || data.loading()">
        <i class="pi pi-refresh" [class.pi-spin]="stats.ordersLoading() || data.loading()" aria-hidden="true"></i>
      </button>
    </header>
  `,
  styles: `:host { display: contents; }`
})
export class StatsHeaderComponent {

  protected readonly stats = inject(StatsService);
  protected readonly data = inject(DataService);

  public readonly title = input.required<string>();
  public readonly back = input('/admin/stats');
  public readonly backLabel = input('Zurück zur Statistik');

  constructor() {
    this.stats.activate();
    inject(DestroyRef).onDestroy(() => this.stats.deactivate());
  }

  protected refresh(): void {
    void this.stats.loadOrders();
    void this.data.reload();
  }
}
