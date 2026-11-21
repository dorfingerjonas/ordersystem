import { Injectable, signal } from '@angular/core';
import { ReceiptPayload } from '../models/models';

/** how long "Beleg drucken" stays offered after a payment */
const OFFER_MS = 5 * 60 * 1000;
const PRINTER_KEY = 'os.receiptPrinter';

/**
 * Remembers the last payment for a few minutes so a payment confirmation
 * ("Zahlungsbestätigung") can be printed on request. Rarely used, therefore
 * only offered right after cashing up.
 */
@Injectable({ providedIn: 'root' })
export class ReceiptService {

  public readonly last = signal<ReceiptPayload | null>(null);
  public readonly dialogOpen = signal(false);

  private timer: ReturnType<typeof setTimeout> | undefined;

  public offer(receipt: ReceiptPayload): void {
    this.last.set(receipt);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (!this.dialogOpen()) this.last.set(null);
    }, OFFER_MS);
  }

  public dismiss(): void {
    clearTimeout(this.timer);
    this.dialogOpen.set(false);
    this.last.set(null);
  }

  public get printerId(): number | null {
    try {
      const value = Number(localStorage.getItem(PRINTER_KEY));
      return Number.isFinite(value) && value > 0 ? value : null;
    } catch {
      return null;
    }
  }

  public set printerId(id: number | null) {
    try {
      if (id === null) {
        localStorage.removeItem(PRINTER_KEY);
      } else {
        localStorage.setItem(PRINTER_KEY, String(id));
      }
    } catch {
      // storage unavailable (private mode) – just do not remember
    }
  }
}
