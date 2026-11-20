import { effect, inject, Injectable, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { CartService } from './cart.service';
import { NotifyService } from './notify.service';

const CHECK_INTERVAL = 5 * 60 * 1000;
const UPDATED_FLAG = 'ordersystem.just-updated';

/**
 * PWA auto updater:
 *  - checks for a new version on start, every 5 minutes and when the app comes back to foreground
 *  - activates it automatically: right away if nothing is being typed/ordered,
 *    otherwise as soon as the waiter is idle (no unsent items, not typing)
 */
@Injectable({ providedIn: 'root' })
export class UpdateService {

  private readonly sw = inject(SwUpdate);
  private readonly cart = inject(CartService);
  private readonly notify = inject(NotifyService);

  public readonly updateReady = signal(false);

  constructor() {
    if (sessionStorage.getItem(UPDATED_FLAG)) {
      sessionStorage.removeItem(UPDATED_FLAG);
      setTimeout(() => this.notify.success('App aktualisiert', 'Die neueste Version ist jetzt aktiv.'), 800);
    }

    if (!this.sw.isEnabled) return;

    this.sw.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(() => {
        this.updateReady.set(true);
        this.tryApply();
      });

    this.sw.unrecoverable.subscribe(() => {
      this.notify.warn('App wird neu geladen', 'Ein Fehler in der gespeicherten Version wurde erkannt.');
      setTimeout(() => location.reload(), 1500);
    });

    // apply pending update once the waiter has nothing pending anymore
    effect(() => {
      if (this.updateReady() && !this.cart.hasAnyPending()) {
        this.tryApply();
      }
    });

    void this.check();
    setInterval(() => void this.check(), CHECK_INTERVAL);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.check();
    });
  }

  public async check(): Promise<void> {
    try {
      await this.sw.checkForUpdate();
    } catch (e) {
      console.warn('update check failed', e);
    }
  }

  /** reloads into the new version (also used by the "Jetzt aktualisieren" button) */
  public async applyNow(): Promise<void> {
    try {
      await this.sw.activateUpdate();
    } finally {
      sessionStorage.setItem(UPDATED_FLAG, '1');
      location.reload();
    }
  }

  private tryApply(): void {
    const typing = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;

    if (!this.updateReady() || this.cart.hasAnyPending() || typing) return;

    void this.applyNow();
  }
}
