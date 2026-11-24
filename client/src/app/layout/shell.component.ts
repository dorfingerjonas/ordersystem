import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { DataService } from '../services/data.service';
import { AuthService } from '../services/auth.service';
import { InstallBannerComponent } from '../components/install-banner.component';
import { InstallService } from '../services/install.service';
import { OutboxEntry, OutboxService } from '../services/outbox.service';

/**
 * Frame of all pages except ordering / paying:
 * bottom tab bar on phones and tablets, sidebar on desktop (≥ 1024px).
 */
@Component({
  selector: 'app-shell',
  imports: [ RouterOutlet, RouterLink, RouterLinkActive, InstallBannerComponent ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="screen app">
      <aside class="sidebar" aria-label="Navigation">
        <a class="brand" routerLink="/tables" aria-label="Ordersystem – Tische">
          <img src="assets/images/ordersystem-clipped.svg" alt="" aria-hidden="true">
        </a>

        <nav class="side-nav" aria-label="Hauptnavigation">
          <a routerLink="/tables" routerLinkActive="active" ariaCurrentWhenActive="page">
            <i class="pi pi-th-large" aria-hidden="true"></i> Tische
          </a>
          <a routerLink="/pay" routerLinkActive="active" ariaCurrentWhenActive="page">
            <i class="pi pi-wallet" aria-hidden="true"></i> Kassieren
          </a>
          @if (!auth.isAdmin()) {
            <a routerLink="/more" routerLinkActive="active" ariaCurrentWhenActive="page">
              <i class="pi pi-ellipsis-h" aria-hidden="true"></i> Mehr
            </a>
          }
        </nav>

        @if (auth.isAdmin()) {
          <span class="side-title" id="side-admin">Verwaltung</span>
          <nav class="side-nav" aria-labelledby="side-admin">
            <a routerLink="/more" routerLinkActive="active" ariaCurrentWhenActive="page">
              <i class="pi pi-chart-bar" aria-hidden="true"></i> Übersicht
            </a>
            <a routerLink="/admin/stats" routerLinkActive="active" ariaCurrentWhenActive="page">
              <i class="pi pi-chart-line" aria-hidden="true"></i> Statistik
            </a>
            <a routerLink="/admin/orders" routerLinkActive="active" ariaCurrentWhenActive="page">
              <i class="pi pi-list" aria-hidden="true"></i> Bestellungen
            </a>
            <a routerLink="/admin/products" routerLinkActive="active" ariaCurrentWhenActive="page">
              <i class="pi pi-box" aria-hidden="true"></i> Produkte
            </a>
            <a routerLink="/admin/sort" routerLinkActive="active" ariaCurrentWhenActive="page">
              <i class="pi pi-sort-alt" aria-hidden="true"></i> Reihenfolge
            </a>
            <a routerLink="/admin/tables" routerLinkActive="active" ariaCurrentWhenActive="page">
              <i class="pi pi-th-large" aria-hidden="true"></i> Tische & Bereiche
            </a>
            <a routerLink="/admin/users" routerLinkActive="active" ariaCurrentWhenActive="page">
              <i class="pi pi-users" aria-hidden="true"></i> Kellner & Konten
            </a>
            <a routerLink="/admin/printers" routerLinkActive="active" ariaCurrentWhenActive="page">
              <i class="pi pi-print" aria-hidden="true"></i> Drucker
              @if (data.printers().length > 0) {
                <span class="status-dot" [class.online]="printersOnline()" [class.offline]="!printersOnline()"
                      [attr.aria-label]="printersOnline() ? 'alle online' : 'nicht alle online'"></span>
              }
            </a>
          </nav>
        }

        <a class="side-user" routerLink="/more">
          <span class="avatar" aria-hidden="true">{{ initial() }}</span>
          <span class="row-main">
            <span class="name">{{ auth.username() }}</span>
            <span class="role">{{ auth.isAdmin() ? 'Admin' : 'Kellner' }}</span>
          </span>
        </a>
      </aside>

      <div class="app-content">
        @if (data.loadError()) {
          <div class="banner banner-error" role="alert">
            <i class="pi pi-wifi" aria-hidden="true"></i>
            <span>Einige Daten konnten nicht geladen werden.</span>
            <button type="button" class="banner-btn" (click)="data.reload()">Erneut versuchen</button>
          </div>
        }

        @if (outbox.pending().length > 0) {
          <div class="banner banner-warn" role="status">
            <i class="pi pi-cloud-upload" aria-hidden="true"></i>
            <span>
              {{ outbox.pending().length === 1 ? '1 Bestellung' : outbox.pending().length + ' Bestellungen' }}
              ({{ outboxTables() }}) noch nicht gesendet – wird automatisch wiederholt.
            </span>
            <button type="button" class="banner-btn" [disabled]="outbox.flushing()" (click)="outbox.flush()">
              {{ outbox.flushing() ? 'Sende …' : 'Jetzt senden' }}
            </button>
          </div>
        }

        @for (entry of outbox.rejected(); track entry.clientId) {
          <div class="banner banner-error" role="alert">
            <i class="pi pi-times-circle" aria-hidden="true"></i>
            <span>Tisch {{ entry.tableNr }}: Bestellung abgelehnt ({{ entry.lastError }})</span>
            <button type="button" class="banner-btn" (click)="outbox.retry(entry.clientId)">Erneut</button>
            <button type="button" class="banner-btn" (click)="discard(entry)">Verwerfen</button>
          </div>
        }

        @if (install.showBanner() && !inAdmin()) {
          <div class="install-slot">
            <app-install-banner />
          </div>
        }

        <router-outlet />
      </div>

      @if (!inAdmin()) {
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
      }
    </div>
  `,
  styles: `
    :host { display: contents; }

    .app-content { flex: 1 1 auto; min-height: 0; min-width: 0; display: flex; flex-direction: column; }

    .install-slot { flex-shrink: 0; padding: 12px var(--os-pad) 0; }

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

    @media (min-width: 768px) {
      .tabbar { padding-inline: max(8px, calc((100% - 560px) / 2)); }
    }

    // ---------- desktop / iPad landscape sidebar ----------
    .sidebar { display: none; }

    @media (min-width: 1024px) {
      .tabbar { display: none; }

      .sidebar {
        flex: 0 0 248px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 20px 14px calc(16px + env(safe-area-inset-bottom)) calc(14px + env(safe-area-inset-left));
        background: var(--os-card);
        border-right: 1px solid var(--os-border);
        overflow-y: auto;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 4px 10px 18px;
        text-decoration: none;
        color: var(--os-text);
        font-size: 18px;
        font-weight: 800;
        letter-spacing: -.3px;
      }

      .brand img { height: 34px; width: auto; max-width: 100%; }
      .sidebar { overflow-x: hidden; }

      .side-title {
        margin: 18px 12px 6px;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .8px;
        color: var(--os-muted);
      }

      .side-nav { display: flex; flex-direction: column; gap: 2px; }

      .side-nav a {
        height: 44px;
        padding: 0 12px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        text-decoration: none;
        color: var(--os-text-2);
        font-size: 15px;
        font-weight: 600;
      }

      .side-nav a i { font-size: 18px; width: 20px; text-align: center; color: var(--os-muted); }
      .side-nav a:hover { background: var(--os-bg); color: var(--os-text); }
      .side-nav a.active { background: var(--os-primary-soft); color: var(--os-on-primary-soft); font-weight: 700; }
      .side-nav a.active i { color: var(--os-on-primary-soft); }
      .side-nav .status-dot { margin-left: auto; }

      .side-user {
        margin-top: auto;
        padding: 10px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        text-decoration: none;
        color: var(--os-text);
      }

      .side-user:hover { background: var(--os-bg); }

      .avatar {
        width: 36px;
        height: 36px;
        flex-shrink: 0;
        border-radius: 50%;
        background: var(--os-seg);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
      }

      .side-user .name { font-size: 14px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .side-user .role { font-size: 12px; color: var(--os-muted); }
    }

    @media (min-width: 1024px) and (max-width: 1279px) {
      .sidebar { flex-basis: 216px; padding-inline: 10px; }
    }
  `
})
export class ShellComponent {
  protected readonly data = inject(DataService);
  protected readonly auth = inject(AuthService);
  protected readonly install = inject(InstallService);
  protected readonly outbox = inject(OutboxService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmationService);

  private readonly url = toSignal(
    this.router.events.pipe(filter(e => e instanceof NavigationEnd), map(e => e.urlAfterRedirects)),
    { initialValue: this.router.url }
  );

  /** admin pages bring their own back button and footer – no tab bar on phones */
  protected readonly inAdmin = computed(() => this.url().startsWith('/admin'));

  protected readonly printersOnline = computed(() => this.data.printers().every(p => p.online));
  protected readonly initial = computed(() => (this.auth.username() || '?').charAt(0).toUpperCase());

  protected readonly outboxTables = computed(() =>
    [ ...new Set(this.outbox.pending().map(e => `Tisch ${ e.tableNr }`)) ].join(', '));

  protected discard(entry: OutboxEntry): void {
    this.confirm.confirm({
      header: 'Bestellung verwerfen?',
      message: `Die Bestellung für Tisch ${ entry.tableNr } wird gelöscht und nicht gedruckt.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Verwerfen',
      rejectLabel: 'Behalten',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary' },
      accept: () => void this.outbox.discard(entry.clientId)
    });
  }
}
