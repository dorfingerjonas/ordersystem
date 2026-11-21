import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DataService } from '../../../services/data.service';
import { NotifyService } from '../../../services/notify.service';

type Mode = 'products' | 'categories';

@Component({
  selector: 'app-sort',
  imports: [ RouterLink ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="screen">
      <header class="page-header">
        <a class="icon-btn" routerLink="/admin/products" aria-label="Abbrechen und zurück">
          <i class="pi pi-times" aria-hidden="true"></i>
        </a>
        <div class="titles">
          <h1>Reihenfolge ändern</h1>
          <span class="subtitle">So erscheint es beim Bestellen</span>
        </div>
      </header>

      <div class="seg" role="toolbar" aria-label="Was sortieren">
        <button type="button" [attr.aria-pressed]="mode() === 'products'" (click)="setMode('products')">Produkte</button>
        <button type="button" [attr.aria-pressed]="mode() === 'categories'" (click)="setMode('categories')">Kategorien</button>
      </div>

      @if (mode() === 'products') {
        <div class="cat-row" role="toolbar" aria-label="Kategorie">
          @for (id of categoryOrder(); track id) {
            <button type="button" class="chip" [attr.aria-pressed]="id === activeCategory()" (click)="category.set(id); moved.set(null)">
              {{ data.categoryById().get(id)?.name }}
            </button>
          }
        </div>
      }

      <main class="page-main">
        <div class="card">
          @for (r of rows(); track r.id; let i = $index; let first = $first; let last = $last) {
            <div class="row" [class.moved]="moved() === r.id">
              <span class="pos">{{ i + 1 }}</span>
              <span class="row-title grow">
                {{ r.name }}
                @if (r.group) {
                  <span class="group-tag">Gruppe</span>
                }
              </span>
              <button type="button" class="step-btn" (click)="move(i, -1)" [disabled]="first" [attr.aria-label]="r.name + ' nach oben'">
                <i class="pi pi-arrow-up" aria-hidden="true"></i>
              </button>
              <button type="button" class="step-btn" (click)="move(i, 1)" [disabled]="last" [attr.aria-label]="r.name + ' nach unten'">
                <i class="pi pi-arrow-down" aria-hidden="true"></i>
              </button>
            </div>
          } @empty {
            <div class="empty"><strong>Nichts zu sortieren</strong></div>
          }
        </div>
      </main>

      <footer class="page-footer">
        <div class="actions">
          <a class="btn-ghost cancel" routerLink="/admin/products">Abbrechen</a>
          <button type="button" class="cta" (click)="save()" [disabled]="!dirty() || saving()">
            @if (saving()) {
              <i class="pi pi-spin pi-spinner" aria-hidden="true"></i> Speichern …
            } @else {
              <i class="pi pi-check" aria-hidden="true"></i> Speichern
            }
          </button>
        </div>
      </footer>
    </div>
  `,
  styles: `
    .cat-row { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding: 0 16px 12px; flex-shrink: 0; }
    .cat-row::-webkit-scrollbar { display: none; }
    .chip { flex-shrink: 0; }
    .card { flex-shrink: 0; }
    .row { gap: 8px; transition: background .2s ease; }
    .row.moved { background: var(--os-primary-soft); }
    .pos { width: 24px; font-size: 14px; font-weight: 700; color: var(--os-muted); text-align: right; }
    .grow { flex: 1 1 auto; min-width: 0; }
    .actions { display: flex; gap: 8px; }
    .cancel { height: 60px; border-radius: 16px; padding: 0 20px; }
    .group-tag { font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 8px; background: var(--os-primary-soft); color: var(--os-on-primary-soft); vertical-align: middle; }
  `
})
export class SortPage {

  protected readonly data = inject(DataService);
  private readonly notify = inject(NotifyService);
  private readonly router = inject(Router);

  protected readonly mode = signal<Mode>('products');
  protected readonly category = signal<number | null>(null);
  protected readonly moved = signal<number | string | null>(null);
  protected readonly saving = signal(false);

  protected readonly categoryOrder = signal<number[]>([]);
  /** category -> entry keys ("p12" single product, "g3" group) */
  protected readonly productOrder = signal<Map<number, string[]>>(new Map());
  protected readonly dirty = signal(false);

  protected readonly activeCategory = computed(() => {
    const order = this.categoryOrder();
    return order.includes(this.category() ?? -1) ? this.category() : order[0] ?? null;
  });

  protected readonly rows = computed<{ id: number | string; name: string; group: boolean }[]>(() => {
    if (this.mode() === 'categories') {
      const cats = this.data.categoryById();
      return this.categoryOrder().map(id => ({ id, name: cats.get(id)?.name ?? '', group: false }));
    }

    const products = this.data.productById();
    const groups = this.data.groupById();

    return (this.productOrder().get(this.activeCategory() ?? -1) ?? []).map(key => {
      const id = Number(key.slice(1));
      return key.startsWith('g')
        ? { id: key, name: groups.get(id)?.name ?? '', group: true }
        : { id: key, name: products.get(id)?.name ?? '', group: false };
    });
  });

  private initialized = false;

  constructor() {
    effect(() => {
      if (!this.data.loaded() || this.initialized) return;

      untracked(() => {
        this.initialized = true;
        this.categoryOrder.set(this.data.categories().map(c => c.id));
        // single products and groups share one order per category (like on the order screen)
        const order = new Map<number, string[]>();

        this.data.catalogByCategory().forEach((entries, category) => {
          const shown = new Set(entries.flatMap(e => e.kind === 'group' ? [ e.group.id ] : []));
          const all = [
            ...entries,
            ...this.data.groups()
              .filter(g => g.category === category && !shown.has(g.id))
              .map(g => ({ kind: 'group' as const, ordering: g.ordering, group: g, variants: [] }))
          ].sort((a, b) => a.ordering - b.ordering);

          order.set(category, all.map(e => e.kind === 'product' ? `p${ e.product.id }` : `g${ e.group.id }`));
        });

        this.productOrder.set(order);
      });
    });
  }

  protected setMode(mode: Mode): void {
    this.mode.set(mode);
    this.moved.set(null);
  }

  protected move(index: number, delta: number): void {
    const swap = <T>(list: T[]) => {
      const next = [ ...list ];
      const j = index + delta;
      if (j < 0 || j >= next.length) return list;
      [ next[index], next[j] ] = [ next[j], next[index] ];
      this.moved.set(next[j] as number | string);
      return next;
    };

    if (this.mode() === 'categories') {
      this.categoryOrder.update(swap);
    } else {
      const category = this.activeCategory();
      if (category === null) return;
      this.productOrder.update(m => new Map(m).set(category, swap(m.get(category) ?? [])));
    }

    this.dirty.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;

    this.saving.set(true);

    try {
      const cats = this.data.categoryById();

      await this.data.saveOrdering(this.data.categoryStore, this.categoryOrder().map(id => cats.get(id)!).filter(Boolean));

      for (const keys of this.productOrder().values()) {
        await this.data.saveCatalogOrdering(keys.map(key => ({
          kind: key.startsWith('g') ? 'group' as const : 'product' as const,
          id: Number(key.slice(1))
        })));
      }

      this.notify.success('Reihenfolge gespeichert', 'Kellner sehen die neue Reihenfolge sofort.');
      await this.router.navigate([ '/admin/products' ]);
    } catch (e) {
      this.notify.error('Reihenfolge konnte nicht gespeichert werden', e);
    } finally {
      this.saving.set(false);
    }
  }
}
