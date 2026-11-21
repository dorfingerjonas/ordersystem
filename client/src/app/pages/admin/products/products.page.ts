import { ChangeDetectionStrategy, Component, computed, effect, inject, input, linkedSignal, signal, untracked } from '@angular/core';
import { AdminStateService } from '../../../services/admin-state.service';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { AutoFocusModule } from 'primeng/autofocus';
import { ConfirmationService } from 'primeng/api';
import { DataService } from '../../../services/data.service';
import { NotifyService } from '../../../services/notify.service';
import { eur } from '../../../utils/format';
import { Category, Product, ProductGroup } from '../../../models/models';
import { CatalogEntry } from '../../../services/data.service';
import { priceRange } from '../../../utils/groups';

@Component({
  selector: 'app-admin-products',
  imports: [ FormsModule, RouterLink, RouterLinkActive, RouterOutlet, ToggleSwitchModule, InputTextModule, IconFieldModule, InputIconModule, DialogModule, ButtonModule, AutoFocusModule ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="screen split" [class.has-detail]="detailOpen()">
    <div class="screen list">
      <header class="page-header">
        <a class="icon-btn" routerLink="/more" aria-label="Zurück zur Verwaltung">
          <i class="pi pi-chevron-left" aria-hidden="true"></i>
        </a>
        <h1 class="grow">Produkte</h1>
        <a class="btn-ghost" routerLink="/admin/sort">
          <i class="pi pi-sort-alt" aria-hidden="true"></i> Reihenfolge
        </a>
      </header>

      <div class="filters">
        <p-iconfield>
          <p-inputicon class="pi pi-search" />
          <input pInputText type="search" placeholder="Produkt suchen" aria-label="Produkt suchen"
                 [ngModel]="search()" (ngModelChange)="search.set($event)" class="search">
        </p-iconfield>

        @if (!search()) {
          <div class="cat-row" role="toolbar" aria-label="Kategorien">
            @for (c of data.categories(); track c.id) {
              <button type="button" class="chip" [attr.aria-pressed]="c.id === active()" (click)="selected.set(c.id)">
                {{ c.name }}
              </button>
            }
            @if (activeCategory(); as cat) {
              <button type="button" class="chip icon" (click)="editCategory(cat)" [attr.aria-label]="'Kategorie ' + cat.name + ' bearbeiten'">
                <i class="pi pi-pencil" aria-hidden="true"></i>
              </button>
            }
            <button type="button" class="chip icon" (click)="editCategory(null)" aria-label="Kategorie hinzufügen">
              <i class="pi pi-plus" aria-hidden="true"></i>
            </button>
          </div>
        }
      </div>

      <main class="page-main">
        @if (search()) {
          <div class="card">
            @for (p of searchResults(); track p.id) {
              @let g = p.product_group !== null ? data.groupById().get(p.product_group) : undefined;
              <div class="row">
                <a class="row-link" [routerLink]="g ? ['/admin/products/group', g.id] : ['/admin/products', p.id]" routerLinkActive="active"
                   [attr.aria-label]="(g ? 'Gruppe ' + g.name : p.name) + ' bearbeiten'">
                  <span class="row-main">
                    <span class="row-title" [class.strike]="!p.available">{{ p.name }}</span>
                    <span class="row-sub">
                      {{ eur(p.price) }} · {{ data.categoryById().get(p.category)?.name }}
                      @if (g) { · Gruppe {{ g.name }} }
                      @if (!p.available) { · <span class="soldout">Ausverkauft</span> }
                    </span>
                  </span>
                </a>
                <p-toggleswitch [ngModel]="p.available" (ngModelChange)="toggleAvailable(p, $event)"
                                [ariaLabel]="p.name + ' verfügbar'" />
              </div>
            } @empty {
              <div class="empty">
                <i class="pi pi-box" aria-hidden="true"></i>
                <strong>Nichts gefunden</strong>
              </div>
            }
          </div>
        } @else {
          <div class="card">
            @for (e of entries(); track e.key) {
              @if (e.kind === 'group') {
                @let open = expanded().has(e.group.id);
                <div class="row group-row">
                  <button type="button" class="row-link" (click)="toggleExpanded(e.group.id)" [attr.aria-expanded]="open"
                          [attr.aria-label]="e.group.name + ', ' + e.variants.length + ' Varianten, ' + (open ? 'zuklappen' : 'aufklappen')">
                    <span class="group-icon" aria-hidden="true"><i class="pi pi-th-large"></i></span>
                    <span class="row-main">
                      <span class="row-title">{{ e.group.name }}</span>
                      <span class="row-sub">{{ groupDetail(e.group) }}</span>
                    </span>
                    <span class="group-meta">
                      <span class="group-price">{{ e.range }}</span>
                      <span class="group-count">{{ e.variants.length }} {{ e.variants.length === 1 ? 'Variante' : 'Varianten' }}{{ e.soldOut ? ' · ' + e.soldOut + ' aus' : '' }}</span>
                    </span>
                    <i class="pi chev" [class.pi-chevron-down]="!open" [class.pi-chevron-up]="open" aria-hidden="true"></i>
                  </button>
                  <a class="icon-btn edit" [routerLink]="['/admin/products/group', e.group.id]" routerLinkActive="active" [attr.aria-label]="'Gruppe ' + e.group.name + ' bearbeiten'">
                    <i class="pi pi-pencil" aria-hidden="true"></i>
                  </a>
                </div>
                @if (open) {
                  @for (v of e.variants; track v.product.id) {
                    <div class="row variant-row">
                      <span class="row-main">
                        <span class="row-title" [class.strike]="!v.product.available">{{ v.product.name }}</span>
                        <span class="row-sub">
                          {{ eur(v.product.price) }}
                          @if (!v.product.available) { · <span class="soldout">Ausverkauft</span> }
                        </span>
                      </span>
                      <p-toggleswitch [ngModel]="v.product.available" (ngModelChange)="toggleAvailable(v.product, $event)"
                                      [ariaLabel]="v.product.name + ' verfügbar'" />
                    </div>
                  } @empty {
                    <div class="row variant-row"><span class="row-sub">Keine aktiven Varianten – Gruppe bearbeiten.</span></div>
                  }
                }
              } @else {
                <div class="row">
                  <a class="row-link" [routerLink]="['/admin/products', e.product.id]" routerLinkActive="active" [attr.aria-label]="e.product.name + ' bearbeiten'">
                    <span class="row-main">
                      <span class="row-title" [class.strike]="!e.product.available">{{ e.product.name }}</span>
                      <span class="row-sub">
                        {{ eur(e.product.price) }}
                        @if (!e.product.available) { · <span class="soldout">Ausverkauft</span> }
                      </span>
                    </span>
                  </a>
                  <p-toggleswitch [ngModel]="e.product.available" (ngModelChange)="toggleAvailable(e.product, $event)"
                                  [ariaLabel]="e.product.name + ' verfügbar'" />
                </div>
              }
            } @empty {
              <div class="empty">
                <i class="pi pi-box" aria-hidden="true"></i>
                <strong>Keine Produkte in dieser Kategorie</strong>
              </div>
            }
          </div>
        }
        <p class="footer-hint">Schalter = verfügbar / ausverkauft · Gruppe antippen = Varianten zeigen</p>
      </main>

      <footer class="page-footer">
        <div class="new-actions">
          <a class="btn-ghost new-btn" routerLink="/admin/products/new" [queryParams]="{ category: active() }">
            <i class="pi pi-plus" aria-hidden="true"></i> Einzelprodukt
          </a>
          <a class="cta dark new-btn" routerLink="/admin/products/group/new" [queryParams]="{ category: active() }">
            <i class="pi pi-plus" aria-hidden="true"></i> Gruppe
          </a>
        </div>
      </footer>
    </div>

    <section class="detail" aria-label="Bearbeiten">
      <router-outlet (activate)="detailOpen.set(true)" (deactivate)="detailOpen.set(false)" />
      @if (!detailOpen()) {
        <div class="empty detail-empty">
          <i class="pi pi-pencil" aria-hidden="true"></i>
          <strong>Produkt oder Gruppe wählen</strong>
          <span>Zum Bearbeiten links anklicken – oder neu anlegen.</span>
        </div>
      }
    </section>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [header]="editing() ? 'Kategorie bearbeiten' : 'Neue Kategorie'"
              [style]="{ width: 'calc(100vw - 32px)', maxWidth: '420px' }" [draggable]="false" [dismissableMask]="true">
      <form class="dialog-form" (ngSubmit)="saveCategory()">
        <div class="field">
          <label for="cat-name">Name</label>
          <input pInputText id="cat-name" name="name" [(ngModel)]="categoryName" required autocomplete="off" [pAutoFocus]="true">
        </div>
        @if (editing(); as cat) {
          @let count = categoryUsage(cat.id);
          <button type="button" class="btn-ghost danger" (click)="deleteCategory(cat)" [disabled]="count > 0">
            <i class="pi pi-trash" aria-hidden="true"></i> Kategorie löschen
          </button>
          @if (count > 0) {
            <span class="hint">Nur leere Kategorien können gelöscht werden ({{ count }} Produkte/Gruppen).</span>
          }
        }
      </form>
      <ng-template #footer>
        <p-button label="Abbrechen" severity="secondary" (onClick)="dialogOpen.set(false)" />
        <p-button label="Speichern" severity="contrast" [loading]="saving()" [disabled]="!categoryName().trim()" (onClick)="saveCategory()" />
      </ng-template>
    </p-dialog>
  `,
  styles: `
    :host { display: contents; }
    .split { flex-direction: column; }
    .split.has-detail > .list { display: none; }
    .split:not(.has-detail) > .detail { display: none; }
    .detail { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
    .detail-empty { display: none; }
    .row:has(.active) { background: var(--os-primary-soft); }
    .row:has(.active) .row-link .row-title { font-weight: 700; }
    .icon-btn.edit.active { background: var(--os-primary-softer); }

    @media (min-width: 1024px) {
      .split { flex-direction: row; }
      .split.has-detail > .list, .split:not(.has-detail) > .detail { display: flex; }
      .list { flex: 1 1 0; min-width: 0; }
      .detail {
        flex: 0 0 clamp(400px, 46%, 640px);
        border-left: 1px solid var(--os-border);
        background: var(--os-card-soft);
        --os-gutter: 24px;
      }
      .detail-empty { display: flex; margin: auto; }
    }

    @media (min-width: 768px) {
      .list .cat-row { flex-wrap: wrap; overflow: visible; }
      .list .filters { flex-direction: row; flex-wrap: wrap; align-items: flex-start; }
      .list .filters p-iconfield { flex: 0 1 280px; }
      .list .filters .cat-row { flex: 1 1 320px; }
      .list .new-actions { width: min(100%, 420px); margin-left: auto; }
    }

    .grow { flex: 1 1 auto; }
    .filters { padding: 0 var(--os-pad) 12px; display: flex; flex-direction: column; gap: 10px; flex-shrink: 0; }
    .search { width: 100%; }
    p-iconfield { display: block; }
    .cat-row { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
    .cat-row::-webkit-scrollbar { display: none; }
    .chip { flex-shrink: 0; }
    .chip.icon { width: 40px; padding: 0; justify-content: center; }
    .row { padding-right: 12px; gap: 6px; }
    .row-link { flex: 1 1 auto; min-width: 0; text-decoration: none; color: inherit; display: flex; min-height: 44px; align-items: center; }
    .strike { text-decoration: line-through; color: var(--os-muted); }
    .soldout { color: var(--os-danger); font-weight: 700; }
    .dialog-form { display: flex; flex-direction: column; gap: 14px; }
    .hint { font-size: 13px; color: var(--os-muted); }
    .card { flex-shrink: 0; }
    button.row-link { border: none; background: transparent; padding: 0; text-align: left; gap: 10px; cursor: pointer; font: inherit; color: inherit; }
    .group-row { padding-right: 8px; }
    .group-row .row-title, .group-row .row-sub { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .group-icon { width: 40px; height: 40px; flex-shrink: 0; border-radius: 12px; background: var(--os-primary-soft); color: var(--os-on-primary-soft); display: flex; align-items: center; justify-content: center; }
    .group-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex-shrink: 0; }
    .group-price { font-size: 14px; font-weight: 600; white-space: nowrap; }
    .group-count { font-size: 12px; font-weight: 700; color: var(--os-on-primary-soft); background: var(--os-primary-soft); padding: 2px 8px; border-radius: 10px; white-space: nowrap; }
    .chev { color: var(--os-faint); font-size: 14px; }
    .edit { flex-shrink: 0; }
    .variant-row { padding-left: 32px; background: var(--os-card-soft); }
    .new-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .new-btn { height: 56px; border-radius: 16px; font-size: 16px; }
  `
})
export class ProductsPage {

  protected readonly data = inject(DataService);
  private readonly notify = inject(NotifyService);
  private readonly confirm = inject(ConfirmationService);

  protected readonly eur = eur;
  protected readonly search = signal('');
  /** ?category= (e.g. after saving a group) */
  public readonly categoryParam = input<string | undefined>(undefined, { alias: 'category' });
  private readonly adminState = inject(AdminStateService);
  /** ?category= wins, otherwise the tab used last (stays when coming back from editing) */
  protected readonly selected = linkedSignal<number | null>(() => {
    const id = Number(this.categoryParam());
    return this.categoryParam() && Number.isFinite(id) ? id : untracked(() => this.adminState.productCategory());
  });

  protected readonly active = computed(() => {
    const cats = this.data.categories();
    return cats.find(c => c.id === this.selected())?.id ?? cats[0]?.id ?? null;
  });

  protected readonly activeCategory = computed(() => this.data.categoryById().get(this.active() ?? -1) ?? null);

  constructor() {
    // remember the tab for the next visit (after editing, sorting …)
    effect(() => {
      const active = this.active();
      if (active !== null && this.data.loaded()) untracked(() => this.adminState.productCategory.set(active));
    });
  }

  /** visible products incl. variants; a group name matches all its variants */
  protected readonly searchResults = computed(() => {
    const q = this.search().trim().toLowerCase();
    const groups = this.data.groupById();

    return this.data.products().filter(p => p.name.toLowerCase().includes(q)
      || (p.product_group !== null && (groups.get(p.product_group)?.name.toLowerCase().includes(q) ?? false)));
  });

  /** single products and groups of the active category (groups without active variants too) */
  protected readonly entries = computed(() => {
    const category = this.active() ?? -1;
    const catalog = this.data.catalogByCategory().get(category) ?? [];
    const shown = new Set(catalog.flatMap(e => e.kind === 'group' ? [ e.group.id ] : []));
    const empty: CatalogEntry[] = this.data.groups()
      .filter(g => g.category === category && !shown.has(g.id))
      .map(group => ({ kind: 'group', ordering: group.ordering, group, variants: [] }));

    return [ ...catalog, ...empty ].map(e => e.kind === 'product'
      ? { ...e, key: `p${ e.product.id }` }
      : {
        ...e,
        key: `g${ e.group.id }`,
        range: priceRange(e.variants.map(v => v.product), eur),
        soldOut: e.variants.filter(v => !v.product.available).length
      });
  });

  /** editor (product / group) is open next to / instead of the list */
  protected readonly detailOpen = signal(false);

  protected readonly expanded = signal<Set<number>>(new Set());

  protected toggleExpanded(id: number): void {
    this.expanded.update(set => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  /** "Apfel, Orange, Johannis · Leitung / Mineral · 0,25l / 0,5l" */
  protected groupDetail(group: ProductGroup): string {
    return group.attributes.map(a => a.values.join(a.values.length > 2 ? ', ' : ' / ')).join(' · ');
  }

  /** products + groups that still use the category */
  protected categoryUsage(id: number): number {
    // archived products count too: they keep the category for revenue / open items
    return this.data.productStore.items().filter(p => p.category === id).length + this.data.groups().filter(g => g.category === id).length;
  }

  // category dialog
  protected readonly dialogOpen = signal(false);
  protected readonly categoryName = signal('');
  protected readonly editing = signal<Category | null>(null);
  protected readonly saving = signal(false);

  protected async toggleAvailable(product: Product, available: boolean): Promise<void> {
    try {
      await this.data.update(this.data.productStore, product.id, { available });
      this.notify.success(available ? `${ product.name } wieder verfügbar` : `${ product.name } ausverkauft`, undefined, 1800);
    } catch (e) {
      this.notify.error('Konnte nicht gespeichert werden', e);
      // revert UI
      this.data.productStore.upsertLocal({ ...product });
    }
  }

  protected editCategory(category: Category | null): void {
    this.editing.set(category);
    this.categoryName.set(category?.name ?? '');
    this.dialogOpen.set(true);
  }

  protected async saveCategory(): Promise<void> {
    const name = this.categoryName().trim();
    if (!name || this.saving()) return;

    this.saving.set(true);

    try {
      const editing = this.editing();

      if (editing) {
        await this.data.update(this.data.categoryStore, editing.id, { name });
        this.notify.success('Kategorie gespeichert');
      } else {
        const created = await this.data.insert(this.data.categoryStore, { name });
        this.selected.set(created.id);
        this.notify.success(`Kategorie „${ name }“ angelegt`, 'Tipp: Unter „Drucker“ festlegen, wo sie gedruckt wird.', 4000);
      }

      this.dialogOpen.set(false);
    } catch (e) {
      this.notify.error('Kategorie konnte nicht gespeichert werden', e);
    } finally {
      this.saving.set(false);
    }
  }

  protected deleteCategory(category: Category): void {
    this.confirm.confirm({
      header: 'Kategorie löschen?',
      message: `„${ category.name }“ wird endgültig gelöscht.`,
      icon: 'pi pi-trash',
      acceptLabel: 'Löschen',
      rejectLabel: 'Abbrechen',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary' },
      accept: async () => {
        try {
          await this.data.remove(this.data.categoryStore, category.id);
          this.dialogOpen.set(false);
          this.selected.set(null);
          this.notify.success('Kategorie gelöscht');
        } catch (e) {
          this.notify.error('Kategorie konnte nicht gelöscht werden', e);
        }
      }
    });
  }
}
