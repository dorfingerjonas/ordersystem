import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { supabase } from '../supabase/supabase';
import { OrderRow, Product } from '../models/models';
import { DataService } from './data.service';
import { AuthService } from './auth.service';
import { cents } from '../utils/format';

/** categorical series colors, fixed order (validated: CVD + normal vision separation) */
export const SERIES_COLORS = [ '#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300' ];
/** single-hue sequential ramp (light = little, dark = much) */
export const BLUE_RAMP = [ '#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#104281' ];

/** an event usually runs past midnight -> a "day" starts at 06:00 */
const DAY_START_HOUR = 6;

/** one sold item, normalized for the statistics */
export interface Sale {
  productId: number | null;
  name: string;
  category: number | null;
  /** price in cents */
  cents: number;
  /** epoch ms it was ordered, null for old rows */
  at: number | null;
  day: string | null;
  table: number | null;
  waiter: string;
  orderId: number | null;
  paid: boolean;
  paidAt: number | null;
  paidDay: string | null;
  paidBy: string;
  /** derived from orders.products (before the statistics migration), paid state unknown */
  legacy: boolean;
}

export interface Series {
  key: string;
  name: string;
  color: string;
  vals: number[];
}

export interface Timeline {
  /** "17:00", one per bucket */
  labels: string[];
  series: Series[];
}

export const UNKNOWN_WAITER = 'Unbekannt';

export function dayKey(ms: number): string {
  const d = new Date(ms - DAY_START_HOUR * 3_600_000);
  return `${ d.getFullYear() }-${ String(d.getMonth() + 1).padStart(2, '0') }-${ String(d.getDate()).padStart(2, '0') }`;
}

export function dayLabel(key: string): string {
  const [ y, m, d ] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = dayKey(Date.now());

  if (key === today) return 'Heute';
  if (key === dayKey(Date.now() - 86_400_000)) return 'Gestern';

  return date.toLocaleDateString('de-AT', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

export function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
}

/** minutes since the start of the (event) day, 0 … 1439 */
function minuteOfDay(ms: number): number {
  const d = new Date(ms);
  return (d.getHours() * 60 + d.getMinutes() - DAY_START_HOUR * 60 + 1440) % 1440;
}

function bucketLabel(bucket: number, interval: number): string {
  const m = (bucket * interval + DAY_START_HOUR * 60) % 1440;
  return `${ String(Math.floor(m / 60)).padStart(2, '0') }:${ String(m % 60).padStart(2, '0') }`;
}

function time(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;

  const ms = typeof value === 'number' ? value : new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Items sold over the (event) day, bucketed by clock time. With "all days"
 * the days are summed up per clock time – shows when the peaks usually are.
 */
export function buildTimeline(sales: Sale[], interval: number, defs: { key: string; name: string; color: string; match: (s: Sale) => boolean }[]): Timeline {
  const timed = sales.filter(s => s.at !== null);

  if (timed.length === 0) return { labels: [], series: defs.map(d => ({ ...d, vals: [] })) };

  const buckets = timed.map(s => Math.floor(minuteOfDay(s.at!) / interval));
  const first = Math.min(...buckets);
  const last = Math.max(...buckets);
  const n = last - first + 1;

  const series = defs.map(d => ({ key: d.key, name: d.name, color: d.color, vals: new Array<number>(n).fill(0) }));

  timed.forEach((s, i) => {
    defs.forEach((d, j) => {
      if (d.match(s)) series[j].vals[buckets[i] - first]++;
    });
  });

  return {
    labels: Array.from({ length: n }, (_, i) => bucketLabel(first + i, interval)),
    series
  };
}

/**
 * Prepares the sold items for the statistics screens and keeps the
 * Items come live from the DataService, orders (only
 * needed for the order counts) are loaded on demand.
 */
@Injectable({ providedIn: 'root' })
export class StatsService {

  private readonly data = inject(DataService);
  private readonly auth = inject(AuthService);

  public readonly orders = signal<OrderRow[]>([]);
  public readonly ordersLoaded = signal(false);
  public readonly ordersLoading = signal(false);

  /** number of open statistics pages */
  private active = 0;
  private reloadTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // new items arrive live -> refresh the order list a little later (only while a stats page is open)
    effect(() => {
      this.data.orderedStore.items().length;

      untracked(() => {
        if (this.active === 0 || !this.ordersLoaded()) return;

        clearTimeout(this.reloadTimer);
        this.reloadTimer = setTimeout(() => void this.loadOrders(), 3000);
      });
    });

    effect(() => {
      if (!this.auth.isLoggedIn()) {
        untracked(() => {
          this.orders.set([]);
          this.ordersLoaded.set(false);
        });
      }
    });
  }

  /** call when a statistics page opens */
  public activate(): void {
    this.active++;

    if (!this.ordersLoaded() && !this.ordersLoading()) void this.loadOrders();
  }

  public deactivate(): void {
    this.active = Math.max(0, this.active - 1);
    if (this.active === 0) clearTimeout(this.reloadTimer);
  }

  public async loadOrders(): Promise<void> {
    this.ordersLoading.set(true);

    try {
      const all: OrderRow[] = [];
      const pageSize = 1000;

      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase.from('orders')
          .select('id,table,waiter,timestamp,products')
          .order('id')
          .range(from, from + pageSize - 1);

        if (error) throw error;

        all.push(...(data as OrderRow[]));

        if (!data || data.length < pageSize) break;
      }

      this.orders.set(all);
      this.ordersLoaded.set(true);
    } catch (e) {
      console.error('loading orders for statistics failed', e);
    } finally {
      this.ordersLoading.set(false);
    }
  }

  // ---------- all data ----------

  public readonly allSales = computed<Sale[]>(() => {
    const products = this.data.productById();
    const rows = this.data.orderedStore.items();
    const linked = new Set(rows.map(o => o.order_id).filter(id => id !== null && id !== undefined));
    // orders without linked items come from before the statistics migration:
    // their items are taken from orders.products (has time, waiter, table)
    const legacyOrders = this.ordersLoaded() ? this.allOrders().filter(o => !linked.has(o.id)) : [];
    const useLegacy = legacyOrders.length > 0;

    const fromRows = rows
      // untimed rows of a table are covered by the legacy orders (else counted twice); direct sales stay
      .filter(o => !(useLegacy && !o.created_at && o.order_id == null && o.table !== null))
      .map<Sale>(o => {
      const product: Product | undefined = o.item !== null ? products.get(o.item) : undefined;
      const at = time(o.created_at);
      const paidAt = o.paid ? time(o.paid_at) : null;
      const waiter = o.waiter?.trim() || UNKNOWN_WAITER;

      return {
        productId: o.item,
        name: product?.name ?? 'Gelöschtes Produkt',
        category: product?.category ?? null,
        cents: cents(o.price ?? product?.price ?? 0),
        at,
        day: at !== null ? dayKey(at) : null,
        table: o.table,
        waiter,
        orderId: o.order_id ?? null,
        paid: o.paid,
        paidAt,
        paidDay: paidAt !== null ? dayKey(paidAt) : null,
        paidBy: o.paid_by?.trim() || (o.paid ? UNKNOWN_WAITER : ''),
        legacy: false
      };
    });

    const fromOrders = legacyOrders.flatMap(order => (Array.isArray(order.products) ? order.products : [])
      .flatMap(line => {
        const product = products.get(line.id);
        const amount = Math.max(0, Math.round(Number(line.amount) || 0));

        return Array.from({ length: amount }, (): Sale => ({
          productId: line.id,
          name: product?.name ?? 'Gelöschtes Produkt',
          category: product?.category ?? null,
          cents: cents(product?.price ?? 0),
          at: order.at,
          day: order.day,
          table: order.table,
          waiter: order.waiter?.trim() || UNKNOWN_WAITER,
          orderId: order.id,
          // paid state of old orders is unknown per item
          paid: false,
          paidAt: null,
          paidDay: null,
          paidBy: '',
          legacy: true
        }));
      }));

    return [ ...fromRows, ...fromOrders ];
  });

  private readonly allOrders = computed(() => this.orders().map(o => {
    const at = time(o.timestamp);
    return { ...o, at, day: at !== null ? dayKey(at) : null };
  }));

  /** day keys with any activity, newest first */
  public readonly days = computed(() => {
    const days = new Set<string>();

    this.allSales().forEach(s => {
      if (s.day) days.add(s.day);
      if (s.paidDay) days.add(s.paidDay);
    });
    this.allOrders().forEach(o => o.day && days.add(o.day));

    return [ ...days ].sort().reverse();
  });

  // ---------- everything (no period filter) ----------

  /** all sold items */
  public readonly sales = this.allSales;

  /** all cashed up items */
  public readonly paidSales = computed(() => this.allSales().filter(s => s.paid));

  public readonly periodOrders = this.allOrders;

  /** number of orders; falls back to distinct order ids while the order list isn't loaded */
  public readonly orderCount = computed(() => this.ordersLoaded()
    ? this.periodOrders().length
    : new Set(this.sales().filter(s => s.orderId !== null).map(s => s.orderId)).size);

  /** one day: "Sa., 22.11., 17:03 – 00:48", several: "15.11. – 22.11., 3 Tage" */
  public readonly periodSubtitle = computed(() => {
    const days = this.days();

    if (days.length === 0) return 'Noch keine Verkäufe';

    if (days.length === 1) {
      const times = this.sales().map(s => s.at).filter((t): t is number => t !== null);
      const label = dayLabel(days[0]);
      return times.length ? `${ label }, ${ clock(Math.min(...times)) } – ${ clock(Math.max(...times)) }` : label;
    }

    const short = (key: string) => { const [ , m, d ] = key.split('-'); return `${ d }.${ m }.`; };
    return `${ short(days[days.length - 1]) } – ${ short(days[0]) }, ${ days.length } Tage`;
  });

  public readonly totals = computed(() => {
    const sales = this.sales();
    const revenue = sales.reduce((a, s) => a + s.cents, 0);
    // still to cash up right now, independent of the period
    const open = this.data.orderedStore.items()
      .filter(o => !o.paid)
      .reduce((a, o) => a + cents(o.price ?? this.data.productById().get(o.item ?? -1)?.price ?? 0), 0);
    const cashed = this.paidSales().reduce((a, s) => a + s.cents, 0);
    const orders = this.orderCount();
    // direct sales (no order) don't count into the average order
    const orderedRevenue = sales.filter(s => s.table !== null).reduce((a, s) => a + s.cents, 0);
    const direct = sales.filter(s => s.table === null);

    return {
      revenue: revenue / 100,
      items: sales.length,
      orders,
      avgOrder: orders > 0 ? orderedRevenue / orders / 100 : 0,
      open: open / 100,
      cashed: cashed / 100,
      directItems: direct.length,
      directRevenue: direct.reduce((a, s) => a + s.cents, 0) / 100
    };
  });

  /** products of the period: quantity and revenue */
  public readonly productStats = computed(() => {
    const map = new Map<string, { key: string; productId: number | null; name: string; category: number | null; qty: number; cents: number }>();

    this.sales().forEach(s => {
      const key = String(s.productId);
      const entry = map.get(key) ?? { key, productId: s.productId, name: s.name, category: s.category, qty: 0, cents: 0 };
      entry.qty++;
      entry.cents += s.cents;
      map.set(key, entry);
    });

    return [ ...map.values() ].sort((a, b) => b.qty - a.qty || b.cents - a.cents);
  });

  /** categories with sales in the period, in category order, fixed colors */
  public readonly categoryStats = computed(() => {
    const sales = this.sales();
    const byCategory = new Map<number | null, { qty: number; cents: number }>();

    sales.forEach(s => {
      const entry = byCategory.get(s.category) ?? { qty: 0, cents: 0 };
      entry.qty++;
      entry.cents += s.cents;
      byCategory.set(s.category, entry);
    });

    const list: { id: number | null; name: string; color: string; qty: number; revenue: number }[] = [];

    // colors follow the category (its position), not the rank
    this.data.categories().forEach((c, i) => {
      const entry = byCategory.get(c.id);
      if (entry) list.push({ id: c.id, name: c.name, color: this.categoryColor(i), qty: entry.qty, revenue: entry.cents / 100 });
    });

    [ ...byCategory.entries() ]
      .filter(([ id ]) => id === null || !this.data.categoryById().has(id))
      .forEach(([ id, entry ]) => list.push({ id, name: 'Ohne Kategorie', color: '#8a857c', qty: entry.qty, revenue: entry.cents / 100 }));

    return list;
  });

  private categoryColor(index: number): string {
    return index < SERIES_COLORS.length ? SERIES_COLORS[index] : '#8a857c';
  }

  /** ordered / cashed up per waiter in the period */
  public readonly waiterStats = computed(() => {
    const map = new Map<string, { name: string; ordered: number; cashed: number; orders: number; items: number }>();
    const get = (name: string) => {
      if (!map.has(name)) map.set(name, { name, ordered: 0, cashed: 0, orders: 0, items: 0 });
      return map.get(name)!;
    };

    this.sales().forEach(s => {
      const w = get(s.waiter);
      w.ordered += s.cents;
      w.items++;
    });
    this.paidSales().forEach(s => get(s.paidBy).cashed += s.cents);

    if (this.ordersLoaded()) {
      this.periodOrders().forEach(o => get(o.waiter?.trim() || UNKNOWN_WAITER).orders++);
    } else {
      const ids = new Map<string, Set<number>>();
      this.sales().forEach(s => {
        if (s.orderId === null) return;
        if (!ids.has(s.waiter)) ids.set(s.waiter, new Set());
        ids.get(s.waiter)!.add(s.orderId);
      });
      ids.forEach((set, name) => get(name).orders = set.size);
    }

    return [ ...map.values() ]
      .filter(w => w.ordered > 0 || w.cashed > 0 || w.orders > 0)
      .map(w => ({ ...w, ordered: w.ordered / 100, cashed: w.cashed / 100 }));
  });

  /** revenue per table in the period (cents), null = direct sale */
  public readonly tableRevenue = computed(() => {
    const map = new Map<number | null, number>();

    this.sales().forEach(s => map.set(s.table, (map.get(s.table) ?? 0) + s.cents));

    return map;
  });
}
