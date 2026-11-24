import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { NewOrder } from '../models/models';
import { AuthService } from './auth.service';
import { DataService } from './data.service';

/** one order waiting in the outbox until the server confirmed it */
export interface OutboxEntry {
  /** UUID created on this device, sent as orders.client_id (idempotency key) */
  clientId: string;
  order: NewOrder;
  /** table nr for the UI ("Tisch 12") */
  tableNr: string;
  createdAt: number;
  attempts: number;
  lastError: string | null;
  /** the server rejected it for good (e.g. table deleted) -> not retried, user decides */
  rejected: boolean;
}

export type SubmitResult = 'sent' | 'queued';

const DB_NAME = 'ordersystem';
const DB_VERSION = 1;
const STORE = 'outbox';
const FALLBACK_KEY = 'ordersystem.outbox.v1';

/** time to wait for the server before an order counts as "queued" */
const SEND_TIMEOUT = 8_000;
const RETRY_DELAYS = [ 2_000, 5_000, 10_000, 20_000, 30_000 ];

/** tiny promise wrapper around IndexedDB; falls back to localStorage if IndexedDB is unavailable */
class OutboxStorage {

  private db: Promise<IDBDatabase | null> | null = null;

  private open(): Promise<IDBDatabase | null> {
    this.db ??= new Promise(resolve => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(STORE)) {
            request.result.createObjectStore(STORE, { keyPath: 'clientId' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
          console.warn('IndexedDB unavailable, outbox uses localStorage', request.error);
          resolve(null);
        };
      } catch (e) {
        console.warn('IndexedDB unavailable, outbox uses localStorage', e);
        resolve(null);
      }
    });

    return this.db;
  }

  private async run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.open();

    if (!db) throw new Error('no indexeddb');

    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = fn(tx.objectStore(STORE));

      // resolve on commit, not on request success: the entry must be on disk
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  public async all(): Promise<OutboxEntry[]> {
    if (!(await this.open())) return this.readFallback();

    const entries = await this.run<OutboxEntry[]>('readonly', s => s.getAll() as IDBRequest<OutboxEntry[]>);
    return entries.sort((a, b) => a.createdAt - b.createdAt);
  }

  public async put(entry: OutboxEntry): Promise<void> {
    if (!(await this.open())) {
      this.writeFallback([ ...this.readFallback().filter(e => e.clientId !== entry.clientId), entry ]);
      return;
    }

    await this.run('readwrite', s => s.put(entry));
  }

  public async delete(clientId: string): Promise<void> {
    if (!(await this.open())) {
      this.writeFallback(this.readFallback().filter(e => e.clientId !== clientId));
      return;
    }

    await this.run('readwrite', s => s.delete(clientId));
  }

  private readFallback(): OutboxEntry[] {
    try {
      const entries = JSON.parse(localStorage.getItem(FALLBACK_KEY) ?? '[]') as OutboxEntry[];
      return Array.isArray(entries) ? entries.sort((a, b) => a.createdAt - b.createdAt) : [];
    } catch {
      return [];
    }
  }

  private writeFallback(entries: OutboxEntry[]): void {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(entries));
  }
}

/**
 * Outbox for orders: every order is written to IndexedDB with a client UUID
 * BEFORE it is sent and only removed once the server confirmed it. A WiFi gap,
 * a closed app or a reload never loses an order; it is resent automatically.
 * Resending is safe because the server ignores a known client_id.
 */
@Injectable({ providedIn: 'root' })
export class OutboxService {

  private readonly data = inject(DataService);
  private readonly auth = inject(AuthService);
  private readonly storage = new OutboxStorage();

  public readonly entries = signal<OutboxEntry[]>([]);
  /** waiting to be (re)sent automatically */
  public readonly pending = computed(() => this.entries().filter(e => !e.rejected));
  /** refused by the server, need a decision */
  public readonly rejected = computed(() => this.entries().filter(e => e.rejected));
  public readonly flushing = signal(false);

  private flushRun: Promise<void> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private failures = 0;

  constructor() {
    void this.refresh();

    effect(() => {
      if (this.auth.isLoggedIn()) this.flushSoon(0);
    });

    window.addEventListener('online', () => this.flushSoon(0));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.flushSoon(0);
    });
    // another tab added / sent something
    window.addEventListener('storage', e => {
      if (e.key === FALLBACK_KEY) void this.refresh();
    });
  }

  /**
   * Stores the order in the outbox and tries to send it right away.
   * Resolves 'sent' when the server confirmed it within a few seconds,
   * 'queued' when it is safely stored and will be sent later.
   * Rejects only if the order could neither be stored nor sent, or the server refused it.
   */
  public async submit(order: NewOrder, tableNr: string): Promise<SubmitResult> {
    const entry: OutboxEntry = {
      clientId: crypto.randomUUID(),
      order,
      tableNr,
      createdAt: Date.now(),
      attempts: 0,
      lastError: null,
      rejected: false
    };

    let stored = true;

    try {
      await this.storage.put(entry);
      this.entries.update(list => [ ...list, entry ]);
    } catch (e) {
      console.error('could not store order in outbox', e);
      stored = false;
    }

    // older orders first, so the kitchen gets them in the right sequence
    await this.flush();

    const current = this.entries().find(e => e.clientId === entry.clientId);

    if (!stored) {
      // not persisted: we only know it arrived if the direct send worked
      await this.data.createOrder(order, entry.clientId, SEND_TIMEOUT);
      return 'sent';
    }

    if (!current) return 'sent';

    if (current.rejected) {
      await this.discard(current.clientId);
      throw new Error(current.lastError ?? 'Der Server hat die Bestellung abgelehnt.');
    }

    return 'queued';
  }

  /** sends all pending entries, oldest first; only one run at a time */
  public flush(): Promise<void> {
    this.flushRun ??= this.doFlush().finally(() => {
      this.flushRun = null;
    });

    return this.flushRun;
  }

  /** removes an entry for good (only for rejected orders / after the user confirmed) */
  public async discard(clientId: string): Promise<void> {
    await this.storage.delete(clientId);
    this.entries.update(list => list.filter(e => e.clientId !== clientId));
  }

  /** puts a rejected entry back into the queue */
  public async retry(clientId: string): Promise<void> {
    const entry = this.entries().find(e => e.clientId === clientId);

    if (!entry) return;

    await this.save({ ...entry, rejected: false, lastError: null });
    this.flushSoon(0);
  }

  private async doFlush(): Promise<void> {
    if (!this.auth.isLoggedIn()) return;

    clearTimeout(this.retryTimer);
    this.flushing.set(true);

    try {
      await this.refresh();

      const tried = new Set<string>();

      // re-read pending() every round: entries submitted during this run are picked up too
      for (let entry: OutboxEntry | undefined = this.pending()[0]; entry; entry = this.pending().find(e => !tried.has(e.clientId))) {
        tried.add(entry.clientId);

        try {
          await this.data.createOrder(entry.order, entry.clientId, SEND_TIMEOUT);
          await this.storage.delete(entry.clientId);
          this.entries.update(list => list.filter(e => e.clientId !== entry.clientId));
          this.failures = 0;
        } catch (error) {
          const rejected = OutboxService.isPermanent(error);

          await this.save({
            ...entry,
            attempts: entry.attempts + 1,
            lastError: OutboxService.message(error),
            rejected
          }).catch(e => console.error('could not update outbox entry', e));

          // network / server trouble: stop here, keep the order of the queue
          if (!rejected) {
            this.failures++;
            break;
          }
        }
      }
    } finally {
      this.flushing.set(false);

      if (this.pending().length > 0) {
        this.flushSoon(RETRY_DELAYS[Math.min(this.failures, RETRY_DELAYS.length) - 1] ?? RETRY_DELAYS[0]);
      }
    }
  }

  private flushSoon(delay: number): void {
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => void this.flush(), delay);
  }

  private async save(entry: OutboxEntry): Promise<void> {
    await this.storage.put(entry);
    this.entries.update(list => list.map(e => e.clientId === entry.clientId ? entry : e));
  }

  private async refresh(): Promise<void> {
    try {
      this.entries.set(await this.storage.all());
    } catch (e) {
      console.error('could not read outbox', e);
    }
  }

  /**
   * Postgres data / constraint errors (22xxx, 23xxx – e.g. the table was deleted)
   * will fail again on every retry. Everything else (offline, timeout, 5xx,
   * expired session) is retried.
   */
  private static isPermanent(error: unknown): boolean {
    const code = (error as { code?: string } | null)?.code ?? '';
    return /^(22|23)/.test(code);
  }

  private static message(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message);
    return String(error);
  }
}
