import { computed, effect, Injectable, signal } from '@angular/core';

export interface CartLine {
  key: string;
  productId: number;
  amount: number;
  note: string;
}

interface Cart {
  lines: CartLine[];
  note: string;
}

const STORAGE_KEY = 'ordersystem.carts.v1';
const RECENT_NOTES_KEY = 'ordersystem.recent-notes.v1';

let keyCounter = 0;
const newKey = () => `${ Date.now().toString(36) }-${ (keyCounter++).toString(36) }`;

/**
 * Unsent orders per table. Kept in localStorage so an app update/reload
 * or switching tables never loses what the waiter already tapped.
 */
@Injectable({ providedIn: 'root' })
export class CartService {

  private readonly carts = signal<Record<number, Cart>>(CartService.read(STORAGE_KEY, {}));
  public readonly recentNotes = signal<string[]>(CartService.read(RECENT_NOTES_KEY, []));

  /** table id -> number of unsent items */
  public readonly pendingCountByTable = computed(() => {
    const map = new Map<number, number>();

    Object.entries(this.carts()).forEach(([ table, cart ]) => {
      const count = cart.lines.reduce((s, l) => s + l.amount, 0);
      if (count > 0) map.set(Number(table), count);
    });

    return map;
  });

  public readonly hasAnyPending = computed(() => this.pendingCountByTable().size > 0);

  constructor() {
    effect(() => CartService.write(STORAGE_KEY, this.carts()));
    effect(() => CartService.write(RECENT_NOTES_KEY, this.recentNotes()));
  }

  public lines(table: number): CartLine[] {
    return this.carts()[table]?.lines ?? [];
  }

  public orderNote(table: number): string {
    return this.carts()[table]?.note ?? '';
  }

  public qtyOf(table: number, productId: number): number {
    return this.lines(table).filter(l => l.productId === productId).reduce((s, l) => s + l.amount, 0);
  }

  public count(table: number): number {
    return this.lines(table).reduce((s, l) => s + l.amount, 0);
  }

  /** +1 / -1 on the product; minus removes from the plain line first, then from noted lines */
  public add(table: number, productId: number, delta = 1): void {
    this.mutate(table, cart => {
      const plain = cart.lines.find(l => l.productId === productId && !l.note);

      if (delta > 0) {
        if (plain) {
          plain.amount += delta;
        } else {
          cart.lines.push({ key: newKey(), productId, amount: delta, note: '' });
        }
        return;
      }

      const target = plain ?? [ ...cart.lines ].reverse().find(l => l.productId === productId);

      if (target) {
        target.amount += delta;
      }
    });
  }

  public setLineAmount(table: number, key: string, amount: number): void {
    this.mutate(table, cart => {
      const line = cart.lines.find(l => l.key === key);
      if (line) line.amount = Math.max(0, amount);
    });
  }

  /**
   * A note always belongs to exactly one piece first:
   * "3x Bier" + note -> "2x Bier" and "1x Bier (note)". Returns the key of the line to edit.
   */
  public splitForNote(table: number, key: string): string {
    let result = key;

    this.mutate(table, cart => {
      const line = cart.lines.find(l => l.key === key);

      if (line && line.amount > 1 && !line.note) {
        line.amount -= 1;
        const single: CartLine = { key: newKey(), productId: line.productId, amount: 1, note: '' };
        cart.lines.splice(cart.lines.indexOf(line) + 1, 0, single);
        result = single.key;
      }
    }, false);

    return result;
  }

  public setNote(table: number, key: string, note: string): void {
    const trimmed = note.trim();

    this.mutate(table, cart => {
      const line = cart.lines.find(l => l.key === key);
      if (line) line.note = trimmed;
    });
  }

  /** remembers a note for the quick-pick chips */
  public rememberNote(note: string): void {
    const trimmed = note.trim();

    if (trimmed) {
      this.recentNotes.update(notes => [ trimmed, ...notes.filter(n => n.toLowerCase() !== trimmed.toLowerCase()) ].slice(0, 6));
    }
  }

  public setOrderNote(table: number, note: string): void {
    this.mutate(table, cart => cart.note = note, false);
  }

  public clear(table: number): void {
    this.carts.update(carts => {
      const next = { ...carts };
      delete next[table];
      return next;
    });
  }

  private mutate(table: number, fn: (cart: Cart) => void, normalize = true): void {
    this.carts.update(carts => {
      const current = carts[table] ?? { lines: [], note: '' };
      const cart: Cart = { note: current.note, lines: current.lines.map(l => ({ ...l })) };

      fn(cart);

      if (normalize) {
        cart.lines = CartService.normalize(cart.lines);
      }

      cart.lines = cart.lines.filter(l => l.amount > 0);

      return { ...carts, [table]: cart };
    });
  }

  /** merges lines of the same product with the same note */
  private static normalize(lines: CartLine[]): CartLine[] {
    const result: CartLine[] = [];

    lines.forEach(line => {
      const same = result.find(l => l.productId === line.productId && l.note.toLowerCase() === line.note.toLowerCase());

      if (same) {
        same.amount += line.amount;
      } else {
        result.push({ ...line });
      }
    });

    return result;
  }

  private static read<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) as T : fallback;
    } catch {
      return fallback;
    }
  }

  private static write(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage full / private mode – cart just isn't persisted
    }
  }
}
