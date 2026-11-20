import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { TextareaModule } from 'primeng/textarea';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmationService } from 'primeng/api';
import { DataService } from '../../services/data.service';
import { CartLine, CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { NotifyService } from '../../services/notify.service';
import { cents, eur } from '../../utils/format';
import { Product } from '../../models/models';

interface ReviewLine {
  line: CartLine;
  product: Product;
  sum: number;
}

interface ReviewGroup {
  label: string;
  printer: string;
  missingPrinter: boolean;
  lines: ReviewLine[];
}

@Component({
  selector: 'app-order',
  imports: [ RouterLink, DrawerModule, TextareaModule, InputTextModule, SkeletonModule ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order.page.html',
  styleUrl: './order.page.scss'
})
export class OrderPage {

  protected readonly data = inject(DataService);
  protected readonly cart = inject(CartService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotifyService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmationService);

  public readonly tableId = input.required<string>();

  protected readonly eur = eur;
  protected readonly id = computed(() => Number(this.tableId()));
  protected readonly table = computed(() => this.data.tableById().get(this.id()));

  /** categories that actually contain products */
  protected readonly categories = computed(() => this.data.categories()
    .filter(c => (this.data.productsByCategory().get(c.id)?.length ?? 0) > 0));

  protected readonly selectedCategory = signal<number | null>(null);
  protected readonly activeCategory = computed(() => {
    const selected = this.selectedCategory();
    const cats = this.categories();
    return cats.find(c => c.id === selected)?.id ?? cats[0]?.id ?? null;
  });

  protected readonly products = computed(() => {
    const category = this.activeCategory();
    return category === null ? [] : this.data.productsByCategory().get(category) ?? [];
  });

  protected readonly lines = computed(() => this.cart.lines(this.id()));

  protected readonly qtyByProduct = computed(() => {
    const map = new Map<number, number>();
    this.lines().forEach(l => map.set(l.productId, (map.get(l.productId) ?? 0) + l.amount));
    return map;
  });

  protected readonly qtyByCategory = computed(() => {
    const products = this.data.productById();
    const map = new Map<number, number>();

    this.lines().forEach(l => {
      const category = products.get(l.productId)?.category;
      if (category !== undefined) map.set(category, (map.get(category) ?? 0) + l.amount);
    });

    return map;
  });

  protected readonly count = computed(() => this.lines().reduce((s, l) => s + l.amount, 0));

  protected readonly total = computed(() => {
    const products = this.data.productById();
    return this.lines().reduce((s, l) => s + cents(products.get(l.productId)?.price ?? 0) * l.amount, 0) / 100;
  });

  protected readonly openAmount = computed(() => (this.data.openCentsByTable().get(this.id()) ?? 0) / 100);

  protected readonly notesCount = computed(() => this.lines().filter(l => l.note).length + (this.orderNote() ? 1 : 0));

  protected readonly orderNote = computed(() => this.cart.orderNote(this.id()));

  /** review sheet: lines grouped by the printer they will be printed on */
  protected readonly groups = computed<ReviewGroup[]>(() => {
    const products = this.data.productById();
    const categories = this.data.categoryById();
    const printers = this.data.printersByCategory();
    const groups = new Map<string, ReviewGroup>();

    const lines = this.lines()
      .map(line => ({ line, product: products.get(line.productId) }))
      .filter((l): l is { line: CartLine; product: Product } => !!l.product)
      .sort((a, b) =>
        (categories.get(a.product.category)?.ordering ?? 0) - (categories.get(b.product.category)?.ordering ?? 0)
        || a.product.ordering - b.product.ordering);

    lines.forEach(({ line, product }) => {
      const names = printers.get(product.category) ?? [];
      const key = names.join(', ') || '–';

      if (!groups.has(key)) {
        groups.set(key, {
          label: names.length ? '' : 'Kein Drucker',
          printer: key,
          missingPrinter: names.length === 0,
          lines: []
        });
      }

      groups.get(key)!.lines.push({ line, product, sum: product.price * line.amount });
    });

    // label = category names inside the group ("Alkohol · Alkoholfrei")
    groups.forEach(group => {
      if (!group.missingPrinter) {
        group.label = [ ...new Set(group.lines.map(l => categories.get(l.product.category)?.name ?? '')) ].join(' · ');
      }
    });

    return [ ...groups.values() ];
  });

  protected readonly reviewOpen = signal(false);
  protected readonly editingKey = signal<string | null>(null);
  private editingProduct: number | null = null;
  protected readonly noteDraft = signal('');
  protected readonly orderNoteOpen = signal(false);
  protected readonly sending = signal(false);

  private touchStartX = 0;
  private touchStartY = 0;

  constructor() {
    // unknown table (deleted / wrong link) -> back to the overview
    effect(() => {
      if (this.data.loaded() && !this.table()) {
        this.notify.warn('Tisch nicht gefunden', 'Der Tisch wurde vermutlich gelöscht.');
        void this.router.navigate([ '/tables' ], { replaceUrl: true });
      }
    });

    // closing the sheet commits a note that is still being typed
    effect(() => {
      if (!this.reviewOpen() && this.editingKey()) this.commitNote();
    });
  }

  // ---------- product grid ----------

  protected tap(product: Product): void {
    if (!product.available) {
      this.notify.warn(`${ product.name } ist ausverkauft`);
      return;
    }

    this.cart.add(this.id(), product.id, 1);
  }

  protected minus(product: Product, event?: Event): void {
    event?.stopPropagation();
    this.cart.add(this.id(), product.id, -1);
  }

  protected selectCategory(id: number): void {
    this.selectedCategory.set(id);
  }

  protected onTouchStart(e: TouchEvent): void {
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  }

  /** swipe left/right switches the category */
  protected onTouchEnd(e: TouchEvent): void {
    const dx = e.changedTouches[0].clientX - this.touchStartX;
    const dy = e.changedTouches[0].clientY - this.touchStartY;

    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

    const cats = this.categories();
    const index = cats.findIndex(c => c.id === this.activeCategory());
    const next = cats[index + (dx < 0 ? 1 : -1)];

    if (next) {
      this.selectedCategory.set(next.id);
      document.getElementById(`cat-${ next.id }`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
  }

  // ---------- review sheet ----------

  protected setAmount(line: CartLine, amount: number): void {
    if (amount > line.amount) {
      const product = this.data.productById().get(line.productId);

      if (product && !product.available) {
        this.notify.warn(`${ product.name } ist ausverkauft`);
        return;
      }
    }

    if (this.editingKey() === line.key && amount === 0) {
      this.editingKey.set(null);
    }

    this.cart.setLineAmount(this.id(), line.key, amount);
  }

  protected startNote(line: CartLine): void {
    if (this.editingKey()) this.commitNote();

    const key = line.note ? line.key : this.cart.splitForNote(this.id(), line.key);

    this.editingProduct = line.productId;
    this.noteDraft.set(line.note);
    this.editingKey.set(key);

    setTimeout(() => document.getElementById('note-input')?.focus(), 50);
  }

  protected pickNote(note: string): void {
    const current = this.noteDraft().trim();
    this.noteDraft.set(current ? `${ current }, ${ note }` : note);
    this.commitNote();
  }

  protected commitNote(): void {
    let key = this.editingKey();
    const draft = this.noteDraft().trim();
    const table = this.id();

    if (!key) return;

    // line could have been merged meanwhile -> split a fresh piece off
    if (!this.cart.lines(table).some(l => l.key === key) && draft && this.editingProduct !== null) {
      const plain = this.cart.lines(table).find(l => l.productId === this.editingProduct && !l.note);
      key = plain ? this.cart.splitForNote(table, plain.key) : null;
    }

    if (key) {
      this.cart.setNote(table, key, draft);
      this.cart.rememberNote(draft);
    }

    this.editingKey.set(null);
    this.editingProduct = null;
  }

  protected setOrderNote(value: string): void {
    this.cart.setOrderNote(this.id(), value);
  }

  protected openReview(): void {
    this.reviewOpen.set(true);
  }

  // ---------- send ----------

  protected send(): void {
    if (this.sending() || this.count() === 0) return;

    if (this.editingKey()) this.commitNote();

    const products = this.data.productById();
    const soldOut = this.lines()
      .map(l => products.get(l.productId))
      .filter((p): p is Product => !!p && !p.available);

    if (soldOut.length > 0) {
      const names = [ ...new Set(soldOut.map(p => p.name)) ].join(', ');

      this.confirm.confirm({
        header: 'Ausverkauft',
        message: `${ names } ist inzwischen ausverkauft. Ohne diese Produkte senden?`,
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Ohne senden',
        rejectLabel: 'Zurück',
        rejectButtonProps: { severity: 'secondary' },
        accept: () => {
          this.lines()
            .filter(l => soldOut.some(p => p.id === l.productId))
            .forEach(l => this.cart.setLineAmount(this.id(), l.key, 0));

          void this.doSend();
        }
      });
      return;
    }

    void this.doSend();
  }

  private async doSend(): Promise<void> {
    const table = this.table();
    const products = this.data.productById();
    const lines = this.lines().filter(l => l.amount > 0 && products.has(l.productId));

    if (!table || lines.length === 0) return;

    const count = lines.reduce((s, l) => s + l.amount, 0);
    const total = this.total();

    this.sending.set(true);

    try {
      await this.data.createOrder({
        table: table.id,
        waiter: this.auth.username(),
        note: this.orderNote().trim(),
        products: lines.map(l => (l.note
          ? { id: l.productId, amount: l.amount, note: l.note }
          : { id: l.productId, amount: l.amount }))
      });

      this.cart.clear(table.id);
      this.reviewOpen.set(false);
      this.notify.success(
        `Tisch ${ table.nr }: Bestellung gesendet`,
        `${ count } Artikel · ${ eur(total) } – wird gedruckt.`,
        3000
      );

      await this.router.navigate([ '/tables' ]);
    } catch (e) {
      this.notify.error('Bestellung wurde NICHT gesendet', e);
    } finally {
      this.sending.set(false);
    }
  }
}
