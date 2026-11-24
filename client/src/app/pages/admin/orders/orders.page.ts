import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../../../supabase/supabase';
import { DataService, PrinterInfo } from '../../../services/data.service';
import { NotifyService } from '../../../services/notify.service';
import { OrderRecord, PrintJob } from '../../../models/models';
import { naturalCompare } from '../../../utils/format';

interface ViewLine {
  name: string;
  amount: number;
  note?: string;
}

interface ViewOrder {
  order: OrderRecord;
  tableNr: string;
  /** lines shown (only the selected printer's when filtered) */
  lines: ViewLine[];
  count: number;
  /** items of this order that go to other printers (only when filtered by printer) */
  otherCount: number;
  /** printers that print a part of this order */
  printerNames: string[];
}

/** printer choice in the reprint dialog: all responsible printers or one device */
type ReprintTarget = 'auto' | number;

const PAGE = 50;

@Component({
  selector: 'app-orders',
  imports: [ DatePipe, FormsModule, RouterLink, DialogModule, ButtonModule, InputTextModule ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './orders.page.html',
  styles: `
    :host { display: contents; --os-page-max: 860px; }
    .filters { display: flex; flex-direction: column; gap: 12px; flex-shrink: 0; }
    .filter { display: flex; flex-direction: column; gap: 6px; border: none; padding: 0; margin: 0; min-width: 0; }
    .filter .label { font-size: 13px; font-weight: 700; color: var(--os-text-2); }
    .chips.scroll { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none; }
    .chip .count { color: var(--os-muted); font-weight: 600; margin-left: 2px; }
    .chip[aria-pressed='true'] .count { color: inherit; opacity: .7; }
    .order { display: flex; flex-direction: column; gap: 8px; padding: 14px 16px; border-bottom: 1px solid var(--os-divider); }
    .order:last-child { border-bottom: none; }
    .order-head { display: flex; align-items: flex-start; gap: 12px; }
    .table-nr {
      flex-shrink: 0; min-width: 48px; height: 48px; padding: 0 8px; border-radius: 12px;
      background: var(--os-primary-soft); color: var(--os-on-primary-soft);
      display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px;
    }
    .order-meta { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .order-title { font-weight: 700; }
    .order-sub { font-size: 13px; color: var(--os-muted); }
    .reprint { flex-shrink: 0; min-height: 40px; font-size: 14px; white-space: nowrap; }
    .lines { list-style: none; margin: 0; padding: 0 0 0 60px; display: flex; flex-direction: column; gap: 2px; font-size: 15px; }
    .lines .note { display: block; font-size: 13px; color: var(--os-text-2); font-weight: 600; }
    .order-note, .other { padding-left: 60px; font-size: 13px; color: var(--os-text-2); }
    .order-note { font-weight: 600; }
    .badge {
      display: inline-block; font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 999px;
      background: var(--os-danger-soft); color: var(--os-on-danger-soft); margin-left: 6px; vertical-align: 1px;
    }
    .more { align-self: center; }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; }
    .hint { font-size: 13px; color: var(--os-muted); }
    .summary { display: flex; flex-direction: column; gap: 2px; font-size: 14px; }
    @media (min-width: 768px) {
      .filters { flex-direction: row; gap: 24px; }
      .filter { flex: 1 1 0; }
      .chips.scroll { flex-wrap: wrap; overflow: visible; }
    }
  `
})
export class OrdersPage implements OnInit, OnDestroy {

  protected readonly data = inject(DataService);
  private readonly notify = inject(NotifyService);

  protected readonly orders = signal<OrderRecord[]>([]);
  protected readonly loaded = signal(false);
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);

  /** infrastructure id */
  protected readonly printerFilter = signal<number | null>(null);
  protected readonly waiterFilter = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly limit = signal(PAGE);

  private channel: RealtimeChannel | null = null;

  // ---------- derived ----------

  /** printers with an infrastructure entry (they get order slips) */
  protected readonly slipPrinters = computed(() => this.data.printers());

  protected readonly waiters = computed(() => {
    const counts = new Map<string, number>();

    this.orders().forEach(o => counts.set(o.waiter || '?', (counts.get(o.waiter || '?') ?? 0) + 1));

    return [ ...counts ].map(([ name, count ]) => ({ name, count })).sort((a, b) => naturalCompare(a.name, b.name));
  });

  private readonly view = computed<ViewOrder[]>(() => {
    const products = this.data.productById();
    const tables = this.data.tableById();
    const printers = this.data.printersByCategory();
    const printer = this.slipPrinters().find(p => p.infrastructure.id === this.printerFilter()) ?? null;
    const categories = printer ? new Set(printer.infrastructure.categories ?? []) : null;
    const waiter = this.waiterFilter();
    const q = this.search().trim().toLowerCase();

    const result: ViewOrder[] = [];

    for (const order of this.orders()) {
      if (waiter !== null && (order.waiter || '?') !== waiter) continue;

      const tableNr = tables.get(order.table)?.nr ?? '?';

      if (q && !tableNr.toLowerCase().startsWith(q) && String(order.id) !== q) continue;

      const all = (order.products ?? []).filter(l => l.amount > 0).map(l => {
        const product = products.get(l.id);
        return { line: l, product, category: product?.category ?? null };
      });

      const shown = categories ? all.filter(l => l.category !== null && categories.has(l.category)) : all;

      if (categories && shown.length === 0) continue;

      const names = new Set<string>();
      all.forEach(l => (l.category !== null ? printers.get(l.category) ?? [] : []).forEach(n => names.add(n)));

      result.push({
        order,
        tableNr,
        lines: shown.map(l => ({ name: l.product?.name ?? `Artikel ${ l.line.id }`, amount: l.line.amount, note: l.line.note })),
        count: shown.reduce((s, l) => s + l.line.amount, 0),
        otherCount: categories ? all.filter(l => !shown.includes(l)).reduce((s, l) => s + l.line.amount, 0) : 0,
        printerNames: [ ...names ].sort(naturalCompare)
      });
    }

    return result;
  });

  protected readonly total = computed(() => this.view().length);
  protected readonly filtered = computed(() => this.printerFilter() !== null || this.waiterFilter() !== null || !!this.search().trim());
  protected readonly visible = computed(() => this.view().slice(0, this.limit()));
  protected readonly unprinted = computed(() => this.orders().filter(o => !o.printed).length);

  // ---------- lifecycle ----------

  public ngOnInit(): void {
    void this.load();
    this.subscribe();
  }

  public ngOnDestroy(): void {
    if (this.channel) void supabase.removeChannel(this.channel);
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);

    try {
      const all: OrderRecord[] = [];
      const pageSize = 1000;

      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase.from('orders')
          .select('id,table,waiter,timestamp,products,note,printed')
          .order('id', { ascending: false })
          .range(from, from + pageSize - 1);

        if (error) throw error;

        all.push(...(data as OrderRecord[]));

        if (!data || data.length < pageSize) break;
      }

      this.orders.set(all);
      this.loaded.set(true);
    } catch (e) {
      console.error('loading orders failed', e);
      this.loadError.set(e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e));
    } finally {
      this.loading.set(false);
    }
  }

  /** new orders and the "printed" flag arrive live while the page is open */
  private subscribe(): void {
    this.channel = supabase.channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        const p = payload as RealtimePostgresChangesPayload<OrderRecord>;

        if (p.eventType === 'DELETE') {
          const id = (p.old as Partial<OrderRecord>).id;
          this.orders.update(list => list.filter(o => o.id !== id));
          return;
        }

        const row = p.new as OrderRecord;

        this.orders.update(list => {
          const index = list.findIndex(o => o.id === row.id);

          if (index === -1) return [ row, ...list ].sort((a, b) => b.id - a.id);

          const next = [ ...list ];
          next[index] = { ...next[index], ...row };
          return next;
        });
      })
      .subscribe(status => {
        // missed something while the socket was down -> reload once it is back
        if (status === 'SUBSCRIBED' && this.loaded()) void this.load();
      });
  }

  // ---------- filters ----------

  protected setPrinter(id: number | null): void {
    this.printerFilter.set(this.printerFilter() === id ? null : id);
    this.limit.set(PAGE);
  }

  protected setWaiter(name: string | null): void {
    this.waiterFilter.set(this.waiterFilter() === name ? null : name);
    this.limit.set(PAGE);
  }

  protected setSearch(value: string): void {
    this.search.set(value);
    this.limit.set(PAGE);
  }

  protected printerLabel(p: PrinterInfo): string {
    return p.device?.name ?? `Drucker ${ p.infrastructure.printer }`;
  }

  // ---------- reprint ----------

  protected readonly reprintOrder = signal<ViewOrder | null>(null);
  protected readonly target = signal<ReprintTarget>('auto');
  /** only for a single device: print the whole order instead of its categories */
  protected readonly whole = signal(false);
  protected readonly printing = signal(false);

  protected readonly online = computed(() => new Set(this.data.printers()
    .filter(p => p.online && p.device)
    .map(p => p.device!.id)));

  /** infrastructure printers that print a part of the order in the dialog */
  protected readonly responsible = computed(() => {
    const view = this.reprintOrder();

    if (!view) return [];

    const products = this.data.productById();
    const categories = new Set((view.order.products ?? []).map(l => products.get(l.id)?.category).filter(c => c !== undefined));

    return this.slipPrinters().filter(p => p.device && (p.infrastructure.categories ?? []).some(c => categories.has(c)));
  });

  protected openReprint(view: ViewOrder): void {
    const filtered = this.slipPrinters().find(p => p.infrastructure.id === this.printerFilter());

    this.reprintOrder.set(view);
    this.target.set(filtered?.device ? filtered.device.id : 'auto');
    this.whole.set(false);
  }

  protected closeReprint(): void {
    if (!this.printing()) this.reprintOrder.set(null);
  }

  protected async reprint(): Promise<void> {
    const view = this.reprintOrder();
    const target = this.target();

    if (!view || this.printing()) return;

    const jobs: { name: string; device: number; all: boolean }[] = target === 'auto'
      ? this.responsible().map(p => ({ name: this.printerLabel(p), device: p.device!.id, all: false }))
      : [ {
        name: this.data.deviceById().get(target)?.name ?? `Drucker ${ target }`,
        device: target,
        all: this.whole()
      } ];

    if (jobs.length === 0) {
      this.notify.warn('Kein Drucker zuständig', 'Wähle einen Drucker und „Ganze Bestellung“.');
      return;
    }

    this.printing.set(true);

    try {
      const results = await Promise.all(jobs.map(async job => {
        try {
          return { job, result: await this.data.reprintOrder(job.device, { order_id: view.order.id, all: job.all }) };
        } catch (e) {
          return { job, result: { status: 'FAILED', message: NotifyService.describe(e) } as PrintJob };
        }
      }));

      const failed = results.filter(r => r.result.status !== 'DONE');

      if (failed.length === 0) {
        this.notify.success(`Tisch ${ view.tableNr }: Bon nachgedruckt`, results.map(r => r.job.name).join(', '));
        this.reprintOrder.set(null);
      } else {
        this.notify.error(
          `Nachdruck fehlgeschlagen (${ failed.map(r => r.job.name).join(', ') })`,
          failed.map(r => r.result.message).filter(Boolean).join(', ') || undefined
        );
      }
    } finally {
      this.printing.set(false);
    }
  }
}
