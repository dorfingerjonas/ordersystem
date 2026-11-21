import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { NotifyService } from '../../services/notify.service';
import { ProductPickerComponent } from '../../components/product-picker.component';
import { cents, eur } from '../../utils/format';
import { Product } from '../../models/models';

interface OpenGroup {
  product: Product;
  ids: string[];
  selected: number;
}

@Component({
  selector: 'app-pay',
  imports: [ FormsModule, RouterLink, DrawerModule, InputTextModule, SkeletonModule, ProductPickerComponent ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pay.page.html',
  styleUrl: './pay.page.scss'
})
export class PayPage {

  protected readonly data = inject(DataService);
  private readonly notify = inject(NotifyService);
  private readonly router = inject(Router);

  public readonly tableId = input.required<string>();

  protected readonly eur = eur;
  protected readonly direct = computed(() => this.tableId() === 'direct');
  protected readonly id = computed(() => this.direct() ? null : Number(this.tableId()));
  protected readonly table = computed(() => this.id() === null ? undefined : this.data.tableById().get(this.id()!));

  /** product id -> number of selected units */
  protected readonly selection = signal<Map<number, number>>(new Map());
  /** product id -> amount sold additionally (not ordered at the table) */
  protected readonly extras = signal<Map<number, number>>(new Map());
  /** raw text of the "Erhalten" field */
  protected readonly receivedText = signal('');
  /** cash received in €, null = not entered */
  protected readonly received = computed(() => {
    const text = this.receivedText().replace(/[€\s]/g, '').replace(',', '.');
    const value = Number(text);
    return text && Number.isFinite(value) && value > 0 ? value : null;
  });
  protected readonly pickerOpen = signal(false);
  protected readonly paying = signal(false);

  protected readonly open = computed<OpenGroup[]>(() => {
    const id = this.id();
    if (id === null) return [];

    const products = this.data.productById();
    const selection = this.selection();
    const groups = new Map<number, OpenGroup>();

    this.data.orderedStore.items()
      .filter(o => !o.paid && o.table === id && o.item !== null)
      .forEach(o => {
        const product = products.get(o.item!);
        if (!product) return;

        if (!groups.has(product.id)) groups.set(product.id, { product, ids: [], selected: 0 });
        groups.get(product.id)!.ids.push(o.id);
      });

    const rank = this.data.productRank();

    return [ ...groups.values() ]
      .map(g => ({ ...g, ids: g.ids.sort(), selected: Math.min(selection.get(g.product.id) ?? 0, g.ids.length) }))
      .sort((a, b) => (rank.get(a.product.id) ?? 0) - (rank.get(b.product.id) ?? 0));
  });

  protected readonly openCents = computed(() => this.open().reduce((s, g) => s + cents(g.product.price) * g.ids.length, 0));
  protected readonly allSelected = computed(() => this.open().length > 0 && this.open().every(g => g.selected === g.ids.length));

  protected readonly extraLines = computed(() => {
    const products = this.data.productById();

    return [ ...this.extras().entries() ]
      .map(([ id, amount ]) => ({ product: products.get(id), amount }))
      .filter((l): l is { product: Product; amount: number } => !!l.product && l.amount > 0);
  });

  protected readonly selectedCount = computed(() =>
    this.open().reduce((s, g) => s + g.selected, 0) + this.extraLines().reduce((s, l) => s + l.amount, 0));

  protected readonly totalCents = computed(() =>
    this.open().reduce((s, g) => s + cents(g.product.price) * g.selected, 0)
    + this.extraLines().reduce((s, l) => s + cents(l.product.price) * l.amount, 0));

  protected readonly total = computed(() => this.totalCents() / 100);
  protected readonly remaining = computed(() =>
    (this.openCents() - this.open().reduce((s, g) => s + cents(g.product.price) * g.selected, 0)) / 100);

  protected readonly receivedCents = computed(() => {
    const r = this.received();
    return r === null ? null : cents(r);
  });

  protected readonly change = computed(() => {
    const r = this.receivedCents();
    return r === null ? null : (r - this.totalCents()) / 100;
  });

  constructor() {
    effect(() => {
      if (this.data.loaded() && !this.direct() && !this.table()) {
        this.notify.warn('Tisch nicht gefunden');
        void this.router.navigate([ '/pay' ], { replaceUrl: true });
      }
    });
  }

  // ---------- selection ----------

  protected toggle(group: OpenGroup): void {
    this.setSelected(group.product.id, group.selected === group.ids.length ? 0 : group.ids.length);
  }

  protected step(group: OpenGroup, delta: number, event: Event): void {
    event.stopPropagation();
    this.setSelected(group.product.id, Math.max(0, Math.min(group.ids.length, group.selected + delta)));
  }

  protected toggleAll(): void {
    const all = this.allSelected();
    const next = new Map<number, number>();

    if (!all) this.open().forEach(g => next.set(g.product.id, g.ids.length));

    this.selection.set(next);
  }

  private setSelected(productId: number, amount: number): void {
    this.selection.update(m => new Map(m).set(productId, amount));
  }

  // ---------- extras ----------

  protected addExtra(product: Product, delta = 1): void {
    this.extras.update(m => {
      const next = new Map(m);
      const amount = (next.get(product.id) ?? 0) + delta;

      if (amount <= 0) {
        next.delete(product.id);
      } else {
        next.set(product.id, amount);
      }

      return next;
    });
  }

  // ---------- cash ----------

  protected setReceived(text: string): void {
    this.receivedText.set(text);
  }

  // ---------- pay ----------

  protected async pay(): Promise<void> {
    if (this.paying() || this.selectedCount() === 0) return;

    const ids = this.open().flatMap(g => g.ids.slice(0, g.selected));
    const extras = this.extraLines().map(l => ({ item: l.product.id, amount: l.amount }));
    const total = this.total();
    const change = this.change();
    const remaining = this.remaining();

    this.paying.set(true);

    try {
      await this.data.pay(ids, extras, this.id());

      const where = this.direct() ? 'Direktverkauf' : `Tisch ${ this.table()?.nr }`;
      const detail = change !== null && change > 0
        ? `Rückgeld: ${ eur(change) }`
        : remaining > 0 ? `Am Tisch noch offen: ${ eur(remaining) }` : 'Alles bezahlt.';

      this.notify.success(`${ where }: ${ eur(total) } kassiert`, detail, change && change > 0 ? 5000 : 3000);

      this.selection.set(new Map());
      this.extras.set(new Map());
      this.receivedText.set('');

      if (!this.direct() && remaining <= 0) {
        await this.router.navigate([ '/pay' ]);
      }
    } catch (e) {
      this.notify.error('Kassieren fehlgeschlagen', e);
    } finally {
      this.paying.set(false);
    }
  }
}
