import { inject, Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

/**
 * Central user feedback: toasts + short haptic feedback on phones.
 */
@Injectable({ providedIn: 'root' })
export class NotifyService {

  private readonly messages = inject(MessageService);

  public success(summary: string, detail?: string, life = 2500): void {
    this.vibrate(30);
    this.messages.add({ severity: 'success', summary, detail, life, icon: 'pi pi-check-circle' });
  }

  public info(summary: string, detail?: string, life = 3000): void {
    this.messages.add({ severity: 'info', summary, detail, life, icon: 'pi pi-info-circle' });
  }

  public warn(summary: string, detail?: string, life = 4000): void {
    this.vibrate([ 40, 60, 40 ]);
    this.messages.add({ severity: 'warn', summary, detail, life, icon: 'pi pi-exclamation-triangle' });
  }

  public error(summary: string, error?: unknown, life = 6000): void {
    this.vibrate([ 80, 60, 80 ]);
    this.messages.add({
      severity: 'error',
      summary,
      detail: NotifyService.describe(error),
      life,
      icon: 'pi pi-times-circle'
    });
  }

  public clear(): void {
    this.messages.clear();
  }

  /** translates common technical errors into something a waiter understands */
  public static describe(error: unknown): string | undefined {
    if (!error) return undefined;

    const msg = typeof error === 'string'
      ? error
      : (error as { message?: string }).message ?? '';

    if (!navigator.onLine || /fetch|network|Failed to fetch|Load failed/i.test(msg)) {
      return 'Keine Internetverbindung. Bitte Verbindung prüfen und erneut versuchen.';
    }

    if (/row-level security|permission denied|42501/i.test(msg)) {
      return 'Keine Berechtigung für diese Aktion.';
    }

    if (/JWT|token/i.test(msg)) {
      return 'Sitzung abgelaufen. Bitte neu anmelden.';
    }

    if (/Invalid login credentials/i.test(msg)) {
      return 'E-Mail oder Passwort falsch.';
    }

    return msg || 'Unbekannter Fehler.';
  }

  private vibrate(pattern: number | number[]): void {
    try {
      navigator.vibrate?.(pattern);
    } catch {
      // not supported
    }
  }
}
