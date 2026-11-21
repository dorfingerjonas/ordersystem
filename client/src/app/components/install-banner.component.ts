import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { InstallService } from '../services/install.service';
import { NotifyService } from '../services/notify.service';

/** Card that invites the user to install the app as PWA. */
@Component({
  selector: 'app-install-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (install.showBanner()) {
      <section class="install card" aria-labelledby="install-title">
        <div class="install-head">
          <img src="assets/icons/icon-96x96.png" alt="" aria-hidden="true" class="app-icon">
          <div class="install-text">
            <strong id="install-title">App installieren</strong>
            <span>Startet schneller, im Vollbild und direkt vom Home-Bildschirm.</span>
          </div>
          <button type="button" class="icon-btn close" (click)="install.dismiss()" aria-label="Später">
            <i class="pi pi-times" aria-hidden="true"></i>
          </button>
        </div>

        @if (install.canPrompt()) {
          <button type="button" class="cta dark install-btn" (click)="installNow()" [disabled]="busy()">
            <i class="pi pi-download" aria-hidden="true"></i> Installieren
          </button>
        } @else if (install.isIos) {
          <ol class="ios-steps">
            <li>
              <span class="step-no">1</span>
              <span>Unten auf <strong>Teilen</strong> <i class="pi pi-upload" aria-label="Teilen-Symbol"></i> tippen</span>
            </li>
            <li>
              <span class="step-no">2</span>
              <span><strong>Zum Home-Bildschirm</strong> <i class="pi pi-plus-circle" aria-hidden="true"></i> wählen</span>
            </li>
          </ol>
        }
      </section>
    }
  `,
  styles: `
    :host { display: contents; }

    .install {
      flex-shrink: 0;
      padding: 14px 14px 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: var(--os-primary-soft);
      border-color: var(--os-primary-softer);
      color: var(--os-on-primary-soft);
    }

    .install-head { display: flex; align-items: center; gap: 12px; }

    .app-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      flex-shrink: 0;
      background: var(--os-card);
      box-shadow: 0 1px 3px rgba(0, 0, 0, .08);
    }

    .install-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .install-text strong { font-size: 16px; font-weight: 700; color: var(--os-text); }
    .install-text span { font-size: 13px; line-height: 1.35; }

    .close { align-self: flex-start; margin: -6px -6px 0 0; color: var(--os-on-primary-soft); }
    .close:active { background: var(--os-primary-softer); }

    .install-btn { height: 48px; font-size: 16px; border-radius: 12px; }

    .ios-steps {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 14px;
    }

    .ios-steps li { display: flex; align-items: center; gap: 10px; }
    .ios-steps strong { color: var(--os-text); }
    .ios-steps i { font-size: 14px; margin-left: 2px; }

    .step-no {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      flex-shrink: 0;
      background: var(--os-card);
      color: var(--os-text);
      font-size: 13px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  `
})
export class InstallBannerComponent {

  protected readonly install = inject(InstallService);
  private readonly notify = inject(NotifyService);

  protected readonly busy = signal(false);

  protected async installNow(): Promise<void> {
    this.busy.set(true);
    try {
      if (await this.install.install()) {
        this.notify.success('App wird installiert', 'Du findest sie gleich auf deinem Home-Bildschirm.');
      }
    } finally {
      this.busy.set(false);
    }
  }
}
