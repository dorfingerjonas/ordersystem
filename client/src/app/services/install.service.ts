import { computed, Injectable, signal } from '@angular/core';

/** Chromium only event, not part of the TS DOM lib */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    /** captured in main.ts before Angular bootstraps (the event may fire very early) */
    __installPrompt?: BeforeInstallPromptEvent | null;
  }
}

const DISMISSED_KEY = 'ordersystem.install-dismissed';
const DISMISS_DAYS = 14;

/**
 * PWA install helper:
 *  - Chromium (Android, Chrome, Edge): keeps the `beforeinstallprompt` event and triggers the native install dialog
 *  - iOS / iPadOS: no install API -> shows "Teilen > Zum Home-Bildschirm" instructions
 *  - hidden when already running as installed app or dismissed in the last 14 days
 */
@Injectable({ providedIn: 'root' })
export class InstallService {

  private deferred: BeforeInstallPromptEvent | null = window.__installPrompt ?? null;

  /** native install dialog can be shown */
  public readonly canPrompt = signal(this.deferred !== null);
  public readonly installed = signal(InstallService.detectStandalone());
  public readonly isIos = InstallService.detectIos();

  private readonly dismissed = signal(InstallService.readDismissed());

  /** app can be installed in some way (used for the "App installieren" entry) */
  public readonly available = computed(() => !this.installed() && (this.canPrompt() || this.isIos));

  /** banner visible */
  public readonly showBanner = computed(() => this.available() && !this.dismissed());

  constructor() {
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      this.deferred = e as BeforeInstallPromptEvent;
      this.canPrompt.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.deferred = null;
      this.canPrompt.set(false);
      this.installed.set(true);
    });

    matchMedia('(display-mode: standalone)').addEventListener('change', e => {
      if (e.matches) this.installed.set(true);
    });
  }

  /** opens the browser's install dialog; must be called from a click */
  public async install(): Promise<boolean> {
    const event = this.deferred;
    if (!event) return false;

    // the event can only be used once
    this.deferred = null;
    window.__installPrompt = null;
    this.canPrompt.set(false);

    await event.prompt();
    const { outcome } = await event.userChoice;

    if (outcome === 'accepted') {
      this.installed.set(true);
    } else {
      this.dismiss();
    }

    return outcome === 'accepted';
  }

  public dismiss(): void {
    this.dismissed.set(true);
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // storage blocked -> only hidden for this session
    }
  }

  private static readDismissed(): boolean {
    try {
      const at = Number(localStorage.getItem(DISMISSED_KEY));
      return at > 0 && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  }

  private static detectStandalone(): boolean {
    return matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  }

  private static detectIos(): boolean {
    const ua = navigator.userAgent;
    // iPadOS 13+ pretends to be a Mac
    return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  }
}
