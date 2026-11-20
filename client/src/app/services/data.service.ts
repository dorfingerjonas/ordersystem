import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../supabase/supabase';
import {
  Area,
  Category,
  Device,
  DeviceType,
  Infrastructure,
  NewOrder,
  OrderedProduct,
  PrintJob,
  Product,
  Table
} from '../models/models';
import { AuthService } from './auth.service';
import { byOrdering, cents, naturalCompare } from '../utils/format';

type Id = number | string;

/** Keeps one DB table in a signal and in sync via realtime. */
class Store<T extends { id: Id }> {

  public readonly items = signal<T[]>([]);
  public readonly loaded = signal(false);

  public readonly error = signal<unknown>(null);

  constructor(public readonly relation: string, private readonly map: (row: T) => T = row => row) {
  }

  public async load(): Promise<void> {
    const all: T[] = [];
    const pageSize = 1000;

    // PostgREST returns max 1000 rows per request -> page through
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase.from(this.relation).select('*').range(from, from + pageSize - 1);

      if (error) throw error;

      all.push(...(data as T[]));

      if (!data || data.length < pageSize) break;
    }

    this.items.set(all.map(this.map));
    this.loaded.set(true);
    this.error.set(null);
  }

  public upsertLocal(...rows: T[]): void {
    this.items.update(items => {
      const next = [ ...items ];

      rows.forEach(row => {
        const index = next.findIndex(i => i.id === row.id);

        if (index === -1) {
          next.push(row);
        } else {
          next[index] = { ...next[index], ...row };
        }
      });

      return next;
    });
  }

  public removeLocal(...ids: Id[]): void {
    this.items.update(items => items.filter(i => !ids.includes(i.id)));
  }

  public apply(payload: RealtimePostgresChangesPayload<T>): void {
    switch (payload.eventType) {
      case 'INSERT':
      case 'UPDATE':
        this.upsertLocal(this.map(payload.new as T));
        break;
      case 'DELETE':
        if ((payload.old as Partial<T>).id !== undefined) {
          this.removeLocal((payload.old as Partial<T>).id as Id);
        }
        break;
    }
  }

  public clear(): void {
    this.items.set([]);
    this.loaded.set(false);
  }
}

export interface PrinterInfo {
  infrastructure: Infrastructure;
  device: Device | undefined;
  online: boolean;
}

@Injectable({ providedIn: 'root' })
export class DataService {

  private readonly auth = inject(AuthService);

  public readonly areaStore = new Store<Area>('area');
  public readonly tableStore = new Store<Table>('tables');
  public readonly categoryStore = new Store<Category>('category');
  // `available` is null/undefined until the migration ran -> treat as available
  public readonly productStore = new Store<Product>('product', p => ({ ...p, available: p.available !== false }));
  public readonly deviceStore = new Store<Device>('device');
  public readonly infrastructureStore = new Store<Infrastructure>('infrastructure');
  public readonly orderedStore = new Store<OrderedProduct>('ordered_product');

  private readonly stores: Store<any>[] = [
    this.areaStore, this.tableStore, this.categoryStore, this.productStore,
    this.deviceStore, this.infrastructureStore, this.orderedStore
  ];

  public readonly loading = signal(false);
  public readonly loaded = computed(() => this.stores.every(s => s.loaded()));
  public readonly loadError = signal<unknown>(null);

  /** ticks every 10s so "online" states of printers re-evaluate */
  private readonly now = signal(Date.now());

  // ---------- derived data ----------

  public readonly areas = computed(() => [ ...this.areaStore.items() ].sort(byOrdering));
  public readonly categories = computed(() => [ ...this.categoryStore.items() ].sort(byOrdering));
  public readonly tables = computed(() => [ ...this.tableStore.items() ].sort(byOrdering));
  public readonly products = computed(() => [ ...this.productStore.items() ].sort(byOrdering));

  public readonly tableById = computed(() => new Map(this.tableStore.items().map(t => [ t.id, t ])));
  public readonly productById = computed(() => new Map(this.productStore.items().map(p => [ p.id, p ])));
  public readonly categoryById = computed(() => new Map(this.categoryStore.items().map(c => [ c.id, c ])));
  public readonly deviceById = computed(() => new Map(this.deviceStore.items().map(d => [ d.id, d ])));

  public readonly productsByCategory = computed(() => {
    const map = new Map<number, Product[]>();

    this.categories().forEach(c => map.set(c.id, []));
    this.products().forEach(p => {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category)!.push(p);
    });

    return map;
  });

  /** areas with their tables; tables without area end up in "Weitere Tische" */
  public readonly tablesByArea = computed(() => {
    const tables = this.tables();
    const sections: { area: Area | null; label: string; tables: Table[] }[] = this.areas().map(area => ({
      area,
      label: area.name,
      tables: tables.filter(t => t.area === area.id)
    }));

    const knownAreas = new Set(this.areas().map(a => a.id));
    const rest = tables.filter(t => t.area === null || !knownAreas.has(t.area));

    if (rest.length > 0) {
      sections.push({ area: null, label: sections.length ? 'Weitere Tische' : 'Alle Tische', tables: rest });
    }

    return sections;
  });

  /** open (unpaid) amount per table in cents */
  public readonly openCentsByTable = computed(() => {
    const products = this.productById();
    const map = new Map<number, number>();

    this.orderedStore.items().forEach(o => {
      if (o.paid || o.table === null || o.item === null) return;

      map.set(o.table, (map.get(o.table) ?? 0) + cents(products.get(o.item)?.price ?? 0));
    });

    return map;
  });

  public readonly revenue = computed(() => {
    const products = this.productById();
    let paid = 0;
    let open = 0;

    this.orderedStore.items().forEach(o => {
      const price = cents(products.get(o.item ?? -1)?.price ?? 0);

      if (o.paid) {
        paid += price;
      } else {
        open += price;
      }
    });

    return { paid: paid / 100, open: open / 100, total: (paid + open) / 100 };
  });

  public readonly printers = computed<PrinterInfo[]>(() => {
    const devices = this.deviceById();
    const now = this.now();

    return this.infrastructureStore.items()
      .map(infrastructure => {
        const device = devices.get(infrastructure.printer);
        const interval = (device?.controlInterval || 10) * 1000;

        return {
          infrastructure,
          device,
          online: !!infrastructure.lastPing && now - infrastructure.lastPing < Math.max(interval * 3, 45_000)
        };
      })
      .sort((a, b) => naturalCompare(a.device?.name ?? '', b.device?.name ?? ''));
  });

  public readonly printerDevices = computed(() => this.deviceStore.items()
    .filter(d => d.deviceType === DeviceType.PRINTER)
    .sort((a, b) => naturalCompare(a.name, b.name)));

  /** category id -> printer device names */
  public readonly printersByCategory = computed(() => {
    const map = new Map<number, string[]>();

    this.printers().forEach(p => (p.infrastructure.categories ?? []).forEach(c => {
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(p.device?.name ?? `Drucker ${ p.infrastructure.printer }`);
    }));

    return map;
  });

  private channel: RealtimeChannel | null = null;
  private resubscribeTimer: ReturnType<typeof setTimeout> | undefined;
  private lastRefresh = 0;

  constructor() {
    effect(() => {
      if (this.auth.isLoggedIn()) {
        void this.start();
      } else {
        this.stop();
      }
    });

    // PWA comes back from background -> websocket might be dead, refresh data
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.refreshIfStale();
    });
    window.addEventListener('online', () => this.refreshIfStale(0));

    setInterval(() => this.now.set(Date.now()), 10_000);
  }

  // ---------- lifecycle ----------

  public async start(): Promise<void> {
    if (this.channel) return;

    this.subscribe();
    await this.reload();
  }

  public stop(): void {
    if (this.channel) {
      void supabase.removeChannel(this.channel);
      this.channel = null;
    }

    clearTimeout(this.resubscribeTimer);
    this.stores.forEach(s => s.clear());
  }

  public async reload(): Promise<void> {
    this.loading.set(true);
    this.lastRefresh = Date.now();

    // load independently: one missing table (e.g. migration not run yet) must not block the rest
    const results = await Promise.allSettled(this.stores.map(s => s.load()));
    const failed = results
      .map((r, i) => ({ r, store: this.stores[i] }))
      .filter(({ r }) => r.status === 'rejected');

    failed.forEach(({ r, store }) => {
      console.error(`loading ${ store.relation } failed`, (r as PromiseRejectedResult).reason);
      store.error.set((r as PromiseRejectedResult).reason);
      store.loaded.set(true);
    });

    this.loadError.set(failed.length ? (failed[0].r as PromiseRejectedResult).reason : null);
    this.loading.set(false);
  }

  private refreshIfStale(minAge = 15_000): void {
    if (!this.auth.isLoggedIn() || Date.now() - this.lastRefresh < minAge) return;

    void this.reload();
  }

  private subscribe(): void {
    let channel = supabase.channel('ordersystem-data');

    this.stores.forEach(store => {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: store.relation },
        payload => store.apply(payload as RealtimePostgresChangesPayload<any>)
      );
    });

    this.channel = channel.subscribe(status => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        // try again later, data is refreshed once we are back
        clearTimeout(this.resubscribeTimer);
        this.resubscribeTimer = setTimeout(() => {
          if (!this.auth.isLoggedIn() || !this.channel) return;

          void supabase.removeChannel(this.channel);
          this.channel = null;
          void this.start();
        }, 5000);
      }
    });
  }

  // ---------- generic writes (also applied locally for instant UI) ----------

  public async insert<T extends { id: Id }>(store: Store<T>, row: Omit<Partial<T>, 'id'>): Promise<T> {
    const { data, error } = await supabase.from(store.relation).insert(row).select().single();

    if (error) throw error;

    store.upsertLocal(data as T);
    return data as T;
  }

  public async update<T extends { id: Id }>(store: Store<T>, id: Id, patch: Partial<T>): Promise<T> {
    const { data, error } = await supabase.from(store.relation).update(patch).eq('id', id).select().single();

    if (error) throw error;

    store.upsertLocal(data as T);
    return data as T;
  }

  public async remove<T extends { id: Id }>(store: Store<T>, id: Id): Promise<void> {
    const { error } = await supabase.from(store.relation).delete().eq('id', id);

    if (error) throw error;

    store.removeLocal(id);
  }

  /** writes new ordering values for the given (already sorted) rows, only changed ones */
  public async saveOrdering<T extends { id: number; ordering: number }>(store: Store<T>, sorted: T[]): Promise<void> {
    const current = [ ...sorted ].map(r => r.ordering).sort((a, b) => a - b);

    // reuse the existing ordering numbers so other rows stay untouched;
    // fall back to 1..n if there are duplicates
    const unique = new Set(current).size === current.length;
    const values = unique ? current : sorted.map((_, i) => i + 1);

    const changes = sorted
      .map((row, i) => ({ row, ordering: values[i] }))
      .filter(({ row, ordering }) => row.ordering !== ordering);

    const results = await Promise.all(changes.map(({ row, ordering }) =>
      supabase.from(store.relation).update({ ordering }).eq('id', row.id)));

    const failed = results.find(r => r.error);

    if (failed?.error) throw failed.error;

    store.upsertLocal(...changes.map(({ row, ordering }) => ({ ...row, ordering })));
  }

  // ---------- domain writes ----------

  public async createOrder(order: NewOrder): Promise<void> {
    const { error } = await supabase.from('orders').insert(order);

    if (error) throw error;
  }

  /**
   * Marks the given ordered_product rows as paid and inserts extra products
   * (sold directly, not ordered at the table) as paid rows.
   */
  public async pay(orderedIds: string[], extras: { item: number; amount: number }[], table: number | null): Promise<void> {
    const tasks: PromiseLike<{ error: unknown }>[] = [];

    if (orderedIds.length > 0) {
      tasks.push(supabase.from('ordered_product').update({ paid: true }).in('id', orderedIds));
    }

    const extraRows = extras.flatMap(e => Array.from({ length: e.amount }, () => ({ item: e.item, table, paid: true })));

    if (extraRows.length > 0) {
      tasks.push(supabase.from('ordered_product').insert(extraRows));
    }

    const results = await Promise.all(tasks);
    const failed = results.find(r => r.error);

    if (failed?.error) throw failed.error;

    this.orderedStore.upsertLocal(...this.orderedStore.items()
      .filter(o => orderedIds.includes(o.id))
      .map(o => ({ ...o, paid: true })));
  }

  /** inserts a test print job and waits until the printer service reports back */
  public async testPrint(deviceId: number, timeoutMs = 25_000): Promise<PrintJob> {
    const { data, error } = await supabase.from('print_job')
      .insert({ device: deviceId, type: 'TEST' })
      .select()
      .single();

    if (error) throw error;

    const job = data as PrintJob;
    const started = Date.now();

    while (Date.now() - started < timeoutMs) {
      await new Promise(r => setTimeout(r, 1500));

      const res = await supabase.from('print_job').select('*').eq('id', job.id).single();

      if (res.data && (res.data as PrintJob).status !== 'PENDING') {
        return res.data as PrintJob;
      }
    }

    return { ...job, status: 'FAILED', message: 'Der Druckservice hat nicht geantwortet. Läuft der Server?' };
  }
}
