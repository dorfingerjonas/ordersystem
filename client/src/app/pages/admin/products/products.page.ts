import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
import { Category, Product } from '../../../models/models';

@Component({
  selector: 'app-admin-products',
  imports: [ FormsModule, RouterLink, ToggleSwitchModule, InputTextModule, IconFieldModule, InputIconModule, DialogModule, ButtonModule, AutoFocusModule ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="screen">
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
        <div class="card">
          @for (p of list(); track p.id) {
            <div class="row">
              <a class="row-link" [routerLink]="['/admin/products', p.id]" [attr.aria-label]="p.name + ' bearbeiten'">
                <span class="row-main">
                  <span class="row-title" [class.strike]="!p.available">{{ p.name }}</span>
                  <span class="row-sub">
                    {{ eur(p.price) }}
                    @if (search()) { · {{ data.categoryById().get(p.category)?.name }} }
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
              <strong>{{ search() ? 'Nichts gefunden' : 'Keine Produkte in dieser Kategorie' }}</strong>
            </div>
          }
        </div>
        <p class="footer-hint">Schalter = verfügbar / ausverkauft</p>
      </main>

      <footer class="page-footer">
        <a class="cta dark" routerLink="/admin/products/new" [queryParams]="{ category: active() }">
          <i class="pi pi-plus" aria-hidden="true"></i> Neues Produkt
        </a>
      </footer>
    </div>

    <p-dialog [(visible)]="dialogOpen" [modal]="true" [header]="editing() ? 'Kategorie bearbeiten' : 'Neue Kategorie'"
              [style]="{ width: 'calc(100vw - 32px)', maxWidth: '420px' }" [draggable]="false" [dismissableMask]="true">
      <form class="dialog-form" (ngSubmit)="saveCategory()">
        <div class="field">
          <label for="cat-name">Name</label>
          <input pInputText id="cat-name" name="name" [(ngModel)]="categoryName" required autocomplete="off" [pAutoFocus]="true">
        </div>
        @if (editing(); as cat) {
          @let count = data.productsByCategory().get(cat.id)?.length ?? 0;
          <button type="button" class="btn-ghost danger" (click)="deleteCategory(cat)" [disabled]="count > 0">
            <i class="pi pi-trash" aria-hidden="true"></i> Kategorie löschen
          </button>
          @if (count > 0) {
            <span class="hint">Nur leere Kategorien können gelöscht werden ({{ count }} Produkte).</span>
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
    .grow { flex: 1 1 auto; }
    .filters { padding: 0 16px 12px; display: flex; flex-direction: column; gap: 10px; flex-shrink: 0; }
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
  `
})
export class ProductsPage {

  protected readonly data = inject(DataService);
  private readonly notify = inject(NotifyService);
  private readonly confirm = inject(ConfirmationService);

  protected readonly eur = eur;
  protected readonly search = signal('');
  protected readonly selected = signal<number | null>(null);

  protected readonly active = computed(() => {
    const cats = this.data.categories();
    return cats.find(c => c.id === this.selected())?.id ?? cats[0]?.id ?? null;
  });

  protected readonly activeCategory = computed(() => this.data.categoryById().get(this.active() ?? -1) ?? null);

  protected readonly list = computed(() => {
    const q = this.search().trim().toLowerCase();

    if (q) {
      return this.data.products().filter(p => p.name.toLowerCase().includes(q));
    }

    return this.data.productsByCategory().get(this.active() ?? -1) ?? [];
  });

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
