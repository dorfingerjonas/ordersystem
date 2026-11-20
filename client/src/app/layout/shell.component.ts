import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DataService } from '../services/data.service';

/** Top level pages with the bottom tab bar (Tische / Kassieren / Mehr). */
@Component({
  selector: 'app-shell',
  imports: [ RouterOutlet, RouterLink, RouterLinkActive ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="screen">
      @if (data.loadError()) {
        <div class="banner banner-error" role="alert">
          <i class="pi pi-wifi" aria-hidden="true"></i>
          <span>Einige Daten konnten nicht geladen werden.</span>
          <button type="button" class="banner-btn" (click)="data.reload()">Erneut versuchen</button>
        </div>
      }

      <router-outlet />

      <nav class="tabbar" aria-label="Hauptnavigation">
        <a routerLink="/tables" routerLinkActive="active" ariaCurrentWhenActive="page">
          <i class="pi pi-th-large" aria-hidden="true"></i>
          Tische
        </a>
        <a routerLink="/pay" routerLinkActive="active" ariaCurrentWhenActive="page">
          <i class="pi pi-wallet" aria-hidden="true"></i>
          Kassieren
        </a>
        <a routerLink="/more" routerLinkActive="active" ariaCurrentWhenActive="page">
          <i class="pi pi-ellipsis-h" aria-hidden="true"></i>
          Mehr
        </a>
      </nav>
    </div>
  `,
  styles: `
    :host { display: contents; }

    .tabbar {
      flex-shrink: 0;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      background: var(--os-card);
      border-top: 1px solid var(--os-border);
      padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
    }

    .tabbar a {
      height: 56px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      text-decoration: none;
      color: var(--os-muted);
      font-size: 13px;
      font-weight: 500;
      border-radius: 12px;
    }

    .tabbar a i { font-size: 22px; }

    .tabbar a.active {
      color: var(--os-text);
      font-weight: 700;
    }

    .tabbar a.active i {
      background: var(--os-primary-soft);
      border-radius: 999px;
      padding: 2px 18px;
    }
  `
})
export class ShellComponent {
  protected readonly data = inject(DataService);
}
