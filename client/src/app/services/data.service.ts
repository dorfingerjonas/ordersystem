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
  ReceiptPayload,
  Product,
  ProductGroup,
  Table
} from '../models/models';
import { AuthService } from './auth.service';
import { byOrdering, cents, naturalCompare } from '../utils/format';
import { ActiveVariant, GroupShape, GroupTile, groupTiles, planGroupSave, ValueRenames, valuesOf } from '../utils/groups';

/** one entry on the order screen / admin list: a single product or a whole group */
export type CatalogEntry =
  | { kind: 'product'; ordering: number; product: Product }
  | { kind: 'group'; ordering: number; group: ProductGroup; variants: ActiveVariant[] };

/** tile on the order screen / pay picker: a single product or (a part of) a group */
export type OrderTile =
  | { kind: 'product'; key: string; product: Product }
  | { kind: 'group'; key: string; tile: GroupTile };

export function catalogTiles(entries: CatalogEntry[]): OrderTile[] {
  return entries.flatMap<OrderTile>(entry => entry.kind === 'product'
    ? [ { kind: 'product', key: `p${ entry.product.id }`, product: entry.product } ]
    : groupTiles(entry.group, entry.variants).map(tile => ({ kind: 'group' as const, key: `g${ tile.key }`, tile })));
}

const normalizeGroup =(g: ProductGroup): ProductGroup => ({
  ...g,
  attributes: Array.isArray(g.attributes) ? g.attributes.map(a => ({ ...a, values: Array.isArray(a.values) ? a.values : [] })) : [],
  prices: g.prices && typeof g.prices === 'object' ? g.prices : {},
  surcharges: g.surcharges && typeof g.surcharges === 'object' ? g.surcharges : {},
  excluded: Array.isArray(g.excluded) ? g.excluded : [],
  prefix_name: g.prefix_name === true
});

type Id = number | string;

/** Keeps one DB table in a signal and in sync via realtime. */
class Store<T extends { id: Id }> {

  public readonly items = signal<T[]>([]);
  public readonly loaded = signal(false);

  public readonly error = signal<unknown>(null);

  constructor(public readonly relation: string, public readonly map: (row: T) => T = row => row) {
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
  public readonly productStore = new Store<Product>('product', p => ({
    ...p,
    available: p.available !== false,
    archived: p.archived === true,
    product_group: p.product_group ?? null,
    variant: p.variant ?? null
  }));
  public readonly productGroupStore = new Store<ProductGroup>('product_group', normalizeGroup);
  public readonly deviceStore = new Store<Device>('device');
  public readonly infrastructureStore = new Store<Infrastructure>('infrastructure');
  public readonly orderedStore = new Store<OrderedProduct>('ordered_product');

  private readonly stores: Store<any>[] = [
    this.areaStore, this.tableStore, this.categoryStore, this.productStore, this.productGroupStore,
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
  /** all visible products (archived variants are left out), incl. variants of groups */
  public readonly products = computed(() => this.productStore.items().filter(p => !p.archived).sort(byOrdering));
  public readonly groups = computed(() => [ ...this.productGroupStore.items() ].sort(byOrdering));

  public readonly tableById = computed(() => new Map(this.tableStore.items().map(t => [ t.id, t ])));
  /** ALL products incl. archived ones – needed for open items and revenue */
  public readonly productById = computed(() => new Map(this.productStore.items().map(p => [ p.id, p ])));
  public readonly groupById = computed(() => new Map(this.productGroupStore.items().map(g => [ g.id, g ])));
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

  /** group id -> all its products (incl. archived) */
  public readonly productsByGroup = computed(() => {
    const map = new Map<number, Product[]>();

    this.productStore.items().forEach(p => {
      if (p.product_group === null) return;
      if (!map.has(p.product_group)) map.set(p.product_group, []);
      map.get(p.product_group)!.push(p);
    });

    return map;
  });

  /**
   * Category -> single products and groups, sorted like on the order screen.
   * A variant whose group is unknown (deleted / not loaded) or that doesn't
   * match its group anymore is shown as a single product so it never gets lost.
   */
  public readonly catalogByCategory = computed(() => {
    const groups = this.groupById();
    const map = new Map<number, CatalogEntry[]>();
    const variantsByGroup = new Map<number, ActiveVariant[]>();

    const push = (category: number, entry: CatalogEntry) => {
      if (!map.has(category)) map.set(category, []);
      map.get(category)!.push(entry);
    };

    this.categories().forEach(c => map.set(c.id, []));

    this.products().forEach(product => {
      const group = product.product_group !== null ? groups.get(product.product_group) : undefined;
      const values = group ? valuesOf(group.attributes, product) : null;

      if (group && values) {
        if (!variantsByGroup.has(group.id)) variantsByGroup.set(group.id, []);
        variantsByGroup.get(group.id)!.push({ product, values });
      } else {
        push(product.category, { kind: 'product', ordering: product.ordering, product });
      }
    });

    this.groups().forEach(group => {
      const variants = variantsByGroup.get(group.id) ?? [];
      const index = (values: string[]) => values.map((v, i) => group.attributes[i].values.indexOf(v));

      variants.sort((a, b) => {
        const ia = index(a.values);
        const ib = index(b.values);
        return ia.reduce((r, v, i) => r || v - ib[i], 0);
      });

      if (variants.length > 0) {
        push(group.category, { kind: 'group', ordering: group.ordering, group, variants });
      }
    });

    map.forEach(entries => entries.sort((a, b) =>
      a.ordering - b.ordering
      || (a.kind === b.kind ? 0 : a.kind === 'group' ? 1 : -1)
      || (a.kind === 'product' ? a.product.id : a.group.id) - (b.kind === 'product' ? b.product.id : b.group.id)));

    return map;
  });

  /** product id -> position like on the order screen (for sorting lists of ordered/open items) */
  public readonly productRank = computed(() => {
    const rank = new Map<number, number>();
    let i = 0;

    this.categories().forEach(c => (this.catalogByCategory().get(c.id) ?? []).forEach(entry => {
      if (entry.kind === 'product') {
        rank.set(entry.product.id, i++);
      } else {
        entry.variants.forEach(v => rank.set(v.product.id, i++));
      }
    }));

    // archived / unknown category: behind everything else
    [ ...this.productStore.items() ].sort(byOrdering).forEach(p => {
      if (!rank.has(p.id)) rank.set(p.id, i++);
    });

    return rank;
  });

  /** next free ordering number (products and groups share one order per category) */
  public nextOrdering(): number {
    const all = [ ...this.productStore.items().map(p => p.ordering), ...this.productGroupStore.items().map(g => g.ordering) ];
    return all.length ? Math.max(...all.map(o => o ?? 0)) + 1 : 1;
  }

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

    const saved = store.map(data as T);
    store.upsertLocal(saved);
    return saved;
  }

  public async update<T extends { id: Id }>(store: Store<T>, id: Id, patch: Partial<T>): Promise<T> {
    const { data, error } = await supabase.from(store.relation).update(patch).eq('id', id).select().single();

    if (error) throw error;

    const saved = store.map(data as T);
    store.upsertLocal(saved);
    return saved;
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

  // ---------- product groups ----------

  /**
   * Creates / updates a group and makes the product table match it:
   * new variants are inserted, changed ones updated, removed / switched off
   * ones archived (never deleted -> revenue and open items stay intact).
   * Not atomic, but idempotent: saving again repairs a half-finished save.
   */
  public async saveGroup(id: number | null, draft: GroupShape & { category: number }, renames: ValueRenames = {}): Promise<ProductGroup> {
    const row = {
      name: draft.name.trim(),
      category: draft.category,
      attributes: draft.attributes.map(a => ({ id: a.id, name: a.name.trim(), values: [ ...a.values ] })),
      prices: draft.prices,
      surcharges: draft.surcharges,
      excluded: draft.excluded,
      prefix_name: draft.prefix_name
    };

    const group = id === null
      ? await this.insert(this.productGroupStore, { ...row, ordering: this.nextOrdering() })
      : await this.update(this.productGroupStore, id, row);

    const existing = this.productsByGroup().get(group.id) ?? [];
    const plan = planGroupSave(group, existing, renames);
    const byId = new Map(existing.map(p => [ p.id, p ]));

    if (plan.inserts.length > 0) {
      const { data, error } = await supabase.from('product')
        .insert(plan.inserts.map(p => ({ ...p, product_group: group.id })))
        .select();

      if (error) throw error;
      this.productStore.upsertLocal(...(data as Product[]).map(this.productStore.map));
    }

    if (plan.updates.length > 0) {
      // one request: upsert the full rows (insert path is never taken, the ids exist)
      const rows = plan.updates.map(u => {
        const { id: _, ...current } = byId.get(u.id)!;
        return { ...current, ...u.patch, id: u.id };
      });
      const { data, error } = await supabase.from('product').upsert(rows).select();

      if (error) throw error;
      this.productStore.upsertLocal(...(data as Product[]).map(this.productStore.map));
    }

    if (plan.archive.length > 0) {
      const { data, error } = await supabase.from('product').update({ archived: true }).in('id', plan.archive).select();

      if (error) throw error;
      this.productStore.upsertLocal(...(data as Product[]).map(this.productStore.map));
    }

    return group;
  }

  /** deletes a group; its products are archived (kept for revenue / open items) */
  public async deleteGroup(group: ProductGroup): Promise<void> {
    const ids = (this.productsByGroup().get(group.id) ?? []).filter(p => !p.archived).map(p => p.id);

    if (ids.length > 0) {
      const { data, error } = await supabase.from('product').update({ archived: true }).in('id', ids).select();

      if (error) throw error;
      this.productStore.upsertLocal(...(data as Product[]).map(this.productStore.map));
    }

    await this.remove(this.productGroupStore, group.id);
  }

  /** writes a new order of single products and groups of one category (shared ordering numbers) */
  public async saveCatalogOrdering(entries: ({ kind: 'product'; id: number } | { kind: 'group'; id: number })[]): Promise<void> {
    const products = this.productById();
    const groups = this.groupById();
    const rows = entries
      .map(e => ({ e, ordering: e.kind === 'product' ? products.get(e.id)?.ordering : groups.get(e.id)?.ordering }))
      .filter((r): r is { e: typeof entries[number]; ordering: number } => r.ordering !== undefined);

    const current = rows.map(r => r.ordering).sort((a, b) => a - b);
    const values = new Set(current).size === current.length ? current : rows.map((_, i) => i + 1);

    const changes = rows
      .map((r, i) => ({ ...r, next: values[i] }))
      .filter(r => r.ordering !== r.next);

    const results = await Promise.all(changes.map(c =>
      supabase.from(c.e.kind === 'product' ? 'product' : 'product_group').update({ ordering: c.next }).eq('id', c.e.id)));

    const failed = results.find(r => r.error);

    if (failed?.error) throw failed.error;

    changes.forEach(c => {
      if (c.e.kind === 'product') {
        this.productStore.upsertLocal({ ...products.get(c.e.id)!, ordering: c.next });
      } else {
        this.productGroupStore.upsertLocal({ ...groups.get(c.e.id)!, ordering: c.next });
      }
    });
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
    // paid_at / created_at / price are set by a DB trigger (server time); paid_by is who cashed up
    const by = this.auth.username() || null;
    const products = this.productById();

    const run = async (withStats: boolean) => {
      const tasks: PromiseLike<{ error: { code?: string; message?: string } | null }>[] = [];

      if (orderedIds.length > 0) {
        tasks.push(supabase.from('ordered_product')
          .update(withStats ? { paid: true, paid_by: by } : { paid: true })
          .in('id', orderedIds));
      }

      const extraRows = extras.flatMap(e => Array.from({ length: e.amount }, () => withStats
        ? { item: e.item, table, paid: true, waiter: by, paid_by: by, price: products.get(e.item)?.price ?? null }
        : { item: e.item, table, paid: true }));

      if (extraRows.length > 0) {
        tasks.push(supabase.from('ordered_product').insert(extraRows));
      }

      return (await Promise.all(tasks)).find(r => r.error)?.error ?? null;
    };

    let error = await run(true);

    // statistics migration not run yet -> unknown columns; pay without them
    // (the update is idempotent, the insert failed as a whole)
    if (error && (error.code === 'PGRST204' || /column/i.test(error.message ?? ''))) {
      console.warn('paying without statistics columns', error);
      error = await run(false);
    }

    if (error) throw error;

    const paidAt = new Date().toISOString();

    this.orderedStore.upsertLocal(...this.orderedStore.items()
      .filter(o => orderedIds.includes(o.id))
      .map(o => ({ ...o, paid: true, paid_by: by, paid_at: o.paid_at ?? paidAt })));
  }

  /** inserts a test print job and waits until the printer service reports back */
  public testPrint(deviceId: number, timeoutMs = 25_000): Promise<PrintJob> {
    return this.runPrintJob({ device: deviceId, type: 'TEST' }, timeoutMs);
  }

  /** prints a payment confirmation ("Zahlungsbestätigung") and waits for the printer service */
  public printReceipt(deviceId: number, payload: ReceiptPayload, timeoutMs = 25_000): Promise<PrintJob> {
    return this.runPrintJob({ device: deviceId, type: 'RECEIPT', payload }, timeoutMs);
  }

  private async runPrintJob(insert: Pick<PrintJob, 'device' | 'type' | 'payload'>, timeoutMs: number): Promise<PrintJob> {
    const { data, error } = await supabase.from('print_job')
      .insert(insert)
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
