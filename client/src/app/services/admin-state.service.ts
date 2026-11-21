import { effect, Injectable, signal } from '@angular/core';

const KEY = 'ordersystem.admin.product-category';

/** small UI state of the admin pages that has to survive navigating between them */
@Injectable({ providedIn: 'root' })
export class AdminStateService {

  /** category tab of the product list (also used by "Reihenfolge") */
  public readonly productCategory = signal<number | null>(AdminStateService.read());

  constructor() {
    effect(() => {
      const id = this.productCategory();

      try {
        if (id === null) {
          sessionStorage.removeItem(KEY);
        } else {
          sessionStorage.setItem(KEY, String(id));
        }
      } catch {
        // storage blocked – the tab is just not remembered after a reload
      }
    });
  }

  private static read(): number | null {
    try {
      const id = Number(sessionStorage.getItem(KEY));
      return Number.isFinite(id) && id > 0 ? id : null;
    } catch {
      return null;
    }
  }
}
