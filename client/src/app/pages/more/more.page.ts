import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';
import { NotifyService } from '../../services/notify.service';
import { UpdateService } from '../../services/update.service';
import { CartService } from '../../services/cart.service';
import { InstallService } from '../../services/install.service';
import { eur } from '../../utils/format';

@Component({
  selector: 'app-more',
  imports: [ RouterLink, SkeletonModule ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header large">
      <h1>{{ auth.isAdmin() ? 'Verwaltung' : 'Mehr' }}</h1>
      <span class="greeting">Hallo, {{ auth.firstName() }}</span>
    </header>

    <main class="page-main">
      @if (auth.isAdmin()) {
        <section class="card revenue" aria-label="Umsatz">
          @if (!data.loaded()) {
            <p-skeleton height="96px" />
          } @else {
            <div class="rev-head">
              <span>Umsatz gesamt</span>
              <strong>{{ eur(data.revenue().total) }}</strong>
            </div>
            <div class="bar" role="img" [attr.aria-label]="paidPercent() + ' Prozent bezahlt'">
              <div class="bar-fill" [style.width.%]="paidPercent()"></div>
            </div>
            <div class="rev-split">
              <div><span class="dot paid"></span>Bezahlt <strong>{{ eur(data.revenue().paid) }}</strong></div>
              <div><span class="dot open"></span>Noch offen <strong>{{ eur(data.revenue().open) }}</strong></div>
            </div>
          }
        </section>

        <nav class="card admin-nav" aria-label="Verwaltung">
          <a class="nav-row" routerLink="/admin/products">
            <span class="nav-icon"><i class="pi pi-box" aria-hidden="true"></i></span>
            <span class="row-main">
              <span class="row-title">Produkte & Kategorien</span>
              <span class="row-sub">{{ data.products().length }} Produkte{{ data.groups().length ? ' · ' + data.groups().length + ' Gruppen' : '' }} · {{ data.categories().length }} Kategorien{{ soldOut() ? ' · ' + soldOut() + ' ausverkauft' : '' }}</span>
            </span>
            <i class="pi pi-chevron-right chev" aria-hidden="true"></i>
          </a>
          <a class="nav-row" routerLink="/admin/tables">
            <span class="nav-icon"><i class="pi pi-th-large" aria-hidden="true"></i></span>
            <span class="row-main">
              <span class="row-title">Tische & Bereiche</span>
              <span class="row-sub">{{ data.tables().length }} Tische · {{ data.areas().length }} Bereiche</span>
            </span>
            <i class="pi pi-chevron-right chev" aria-hidden="true"></i>
          </a>
          <a class="nav-row" routerLink="/admin/printers">
            <span class="nav-icon"><i class="pi pi-print" aria-hidden="true"></i></span>
            <span class="row-main">
              <span class="row-title">Drucker</span>
              <span class="row-sub">{{ data.printers().length }} eingebunden · {{ onlinePrinters() }} online</span>
            </span>
            @if (data.printers().length > 0) {
              <span class="status-dot" [class.online]="onlinePrinters() === data.printers().length"
                    [class.offline]="onlinePrinters() < data.printers().length" aria-hidden="true"></span>
            }
            <i class="pi pi-chevron-right chev" aria-hidden="true"></i>
          </a>
        </nav>
      }

      <section class="card">
        <div class="row">
          <span class="nav-icon user"><i class="pi pi-user" aria-hidden="true"></i></span>
          <span class="row-main">
            <span class="row-title">{{ auth.username() }}</span>
            <span class="row-sub">{{ auth.email() }} · {{ auth.isAdmin() ? 'Admin' : 'Kellner' }}</span>
          </span>
        </div>
        <button type="button" class="nav-row" (click)="checkUpdate()" [disabled]="checking()">
          <span class="nav-icon soft"><i class="pi pi-refresh" [class.pi-spin]="checking()" aria-hidden="true"></i></span>
          <span class="row-main">
            <span class="row-title">Nach Update suchen</span>
            <span class="row-sub">Neue Versionen werden automatisch installiert</span>
          </span>
        </button>
        @if (install.available()) {
          <button type="button" class="nav-row" (click)="installApp()">
            <span class="nav-icon soft"><i class="pi pi-download" aria-hidden="true"></i></span>
            <span class="row-main">
              <span class="row-title">App installieren</span>
              <span class="row-sub">Schneller Start & Vollbild vom Home-Bildschirm</span>
            </span>
          </button>
        }
      </section>

      <button type="button" class="btn-ghost danger logout" (click)="logout()">
        <i class="pi pi-sign-out" aria-hidden="true"></i> Abmelden
      </button>
    </main>
  `,
  styles: `
    :host { display: contents; --os-page-max: 960px; }
    @media (min-width: 768px) {
      .admin-nav { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); background: transparent; border: none; gap: 12px; overflow: visible; }
      .admin-nav .nav-row { border: 1px solid var(--os-border); border-radius: var(--os-radius-lg); align-items: flex-start; flex-wrap: wrap; min-height: 120px; padding: 16px; }
      .admin-nav .nav-row .row-main { flex: 1 1 100%; order: 2; }
      .admin-nav .nav-row .chev { margin-left: auto; }
      .page-main .logout { width: auto; align-self: flex-start; padding: 0 24px; }
    }
    .revenue { padding: 16px; display: flex; flex-direction: column; gap: 12px; flex-shrink: 0; }
    .rev-head { display: flex; justify-content: space-between; align-items: baseline; }
    .rev-head span { font-size: 14px; font-weight: 600; color: var(--os-text-2); }
    .rev-head strong { font-size: 26px; font-weight: 800; }
    .bar { height: 10px; border-radius: 5px; background: var(--os-primary-softer); overflow: hidden; }
    .bar-fill { height: 100%; background: var(--os-success); border-radius: 5px; transition: width .3s ease; }
    .rev-split { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px; color: var(--os-text-2); }
    .rev-split div { display: flex; flex-direction: column; gap: 2px; padding-left: 14px; position: relative; }
    .rev-split strong { font-size: 16px; color: var(--os-text); }
    .dot { position: absolute; left: 0; top: 5px; width: 8px; height: 8px; border-radius: 50%; }
    .dot.paid { background: var(--os-success); }
    .dot.open { background: var(--os-primary-strong); }
    .card { flex-shrink: 0; }
    .nav-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .nav-icon.user { background: var(--os-seg); }
    .nav-icon.soft { background: var(--os-seg); color: var(--os-text); }
    .row { gap: 14px; min-height: 72px; }
    .logout { height: 52px; width: 100%; }
  `
})
export class MorePage {

  protected readonly data = inject(DataService);
  protected readonly auth = inject(AuthService);
  private readonly notify = inject(NotifyService);
  private readonly confirm = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly update = inject(UpdateService);
  private readonly cart = inject(CartService);
  protected readonly install = inject(InstallService);

  protected readonly eur = eur;
  protected readonly checking = signal(false);

  protected readonly paidPercent = computed(() => {
    const r = this.data.revenue();
    return r.total > 0 ? Math.round(r.paid / r.total * 100) : 0;
  });

  protected readonly onlinePrinters = computed(() => this.data.printers().filter(p => p.online).length);
  protected readonly soldOut = computed(() => this.data.products().filter(p => !p.available).length);

  protected async checkUpdate(): Promise<void> {
    this.checking.set(true);
    await this.update.check();
    this.checking.set(false);

    if (this.update.updateReady()) {
      if (this.cart.hasAnyPending()) {
        this.notify.info('Update bereit', 'Wird installiert, sobald alle Bestellungen gesendet sind.');
      }
    } else {
      this.notify.success('App ist aktuell');
    }
  }

  protected async installApp(): Promise<void> {
    if (this.install.canPrompt()) {
      if (await this.install.install()) {
        this.notify.success('App wird installiert', 'Du findest sie gleich auf deinem Home-Bildschirm.');
      }
    } else if (this.install.isIos) {
      this.notify.info('App installieren', 'Unten auf „Teilen“ tippen und „Zum Home-Bildschirm“ wählen.', 8000);
    }
  }

  protected logout(): void {
    const pending = this.cart.hasAnyPending();

    this.confirm.confirm({
      header: 'Abmelden?',
      message: pending
        ? 'Es gibt noch nicht gesendete Bestellungen. Diese bleiben auf diesem Gerät gespeichert.'
        : 'Du kannst dich jederzeit wieder anmelden.',
      icon: 'pi pi-sign-out',
      acceptLabel: 'Abmelden',
      rejectLabel: 'Abbrechen',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary' },
      accept: async () => {
        await this.auth.signOut();
        this.notify.info('Abgemeldet');
        await this.router.navigate([ '/login' ]);
      }
    });
  }
}
