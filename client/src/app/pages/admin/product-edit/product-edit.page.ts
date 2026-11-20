import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ConfirmationService } from 'primeng/api';
import { DataService } from '../../../services/data.service';
import { NotifyService } from '../../../services/notify.service';

@Component({
  selector: 'app-product-edit',
  imports: [ FormsModule, RouterLink, InputTextModule, InputNumberModule, ToggleSwitchModule ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="screen">
      <header class="page-header">
        <a class="icon-btn" routerLink="/admin/products" aria-label="Zurück zu den Produkten">
          <i class="pi pi-chevron-left" aria-hidden="true"></i>
        </a>
        <h1>{{ isNew() ? 'Neues Produkt' : 'Produkt bearbeiten' }}</h1>
      </header>

      <main class="page-main">
        <form class="card form" id="product-form" (ngSubmit)="save()">
          <div class="field">
            <label for="pname">Name</label>
            <input pInputText id="pname" name="name" [ngModel]="name()" (ngModelChange)="name.set($event)" required
                   autocomplete="off" placeholder="z. B. Bier 0,5l">
          </div>

          <div class="field">
            <label for="pprice">Preis</label>
            <p-inputnumber inputId="pprice" name="price" [ngModel]="price()" (ngModelChange)="price.set($event ?? 0)"
                           mode="currency" currency="EUR" locale="de-DE" [min]="0" inputmode="decimal" />
          </div>

          <fieldset class="field">
            <legend class="label">Kategorie</legend>
            <div class="chips">
              @for (c of data.categories(); track c.id) {
                <button type="button" class="chip" [attr.aria-pressed]="c.id === category()" (click)="category.set(c.id)">{{ c.name }}</button>
              }
            </div>
            <span class="hint">
              <i class="pi pi-print" aria-hidden="true"></i>
              @if (printers().length) {
                Wird gedruckt auf: {{ printers().join(', ') }}
              } @else {
                Achtung: Für diese Kategorie ist kein Drucker eingestellt.
              }
            </span>
          </fieldset>

          <div class="switch-row">
            <div class="row-main">
              <span class="row-title">Verfügbar</span>
              <span class="row-sub">{{ available() ? 'Kellner sehen das Produkt' : 'Ausverkauft – beim Bestellen ausgegraut' }}</span>
            </div>
            <p-toggleswitch name="available" [ngModel]="available()" (ngModelChange)="available.set($event)" ariaLabel="Verfügbar" />
          </div>
        </form>

        @if (!isNew()) {
          <button type="button" class="btn-ghost danger delete" (click)="remove()">
            <i class="pi pi-trash" aria-hidden="true"></i> Produkt löschen
          </button>
        }
      </main>

      <footer class="page-footer">
        <button type="submit" form="product-form" class="cta" [disabled]="!valid() || saving()">
          @if (saving()) {
            <i class="pi pi-spin pi-spinner" aria-hidden="true"></i> Speichern …
          } @else {
            <i class="pi pi-check" aria-hidden="true"></i> Speichern
          }
        </button>
      </footer>
    </div>
  `,
  styles: `
    .form { padding: 16px; display: flex; flex-direction: column; gap: 18px; flex-shrink: 0; }
    fieldset { border: none; padding: 0; margin: 0; }
    legend { margin-bottom: 6px; }
    .hint { display: flex; gap: 6px; align-items: center; margin-top: 4px; }
    .switch-row { display: flex; align-items: center; gap: 12px; }
    .delete { width: 100%; height: 52px; }
  `
})
export class ProductEditPage {

  protected readonly data = inject(DataService);
  private readonly notify = inject(NotifyService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmationService);

  public readonly productId = input.required<string>();
  /** preselected category for new products (?category=) */
  public readonly categoryParam = input<string | undefined>(undefined, { alias: 'category' });

  protected readonly isNew = computed(() => this.productId() === 'new');
  protected readonly product = computed(() => this.isNew() ? null : this.data.productById().get(Number(this.productId())) ?? null);

  protected readonly name = signal('');
  protected readonly price = signal(0);
  protected readonly category = signal<number | null>(null);
  protected readonly available = signal(true);
  protected readonly saving = signal(false);

  protected readonly printers = computed(() => this.data.printersByCategory().get(this.category() ?? -1) ?? []);
  protected readonly valid = computed(() => !!this.name().trim() && this.category() !== null && this.price() >= 0);

  private initialized = false;

  constructor() {
    // fill the form once data is there
    effect(() => {
      const loaded = this.data.loaded();
      const product = this.product();

      if (!loaded || this.initialized) return;

      untracked(() => {
        this.initialized = true;

        if (this.isNew()) {
          const preselected = Number(this.categoryParam());
          this.category.set(this.data.categoryById().has(preselected) ? preselected : this.data.categories()[0]?.id ?? null);
        } else if (product) {
          this.name.set(product.name);
          this.price.set(product.price);
          this.category.set(product.category);
          this.available.set(product.available);
        } else {
          this.notify.warn('Produkt nicht gefunden');
          void this.router.navigate([ '/admin/products' ], { replaceUrl: true });
        }
      });
    });
  }

  protected async save(): Promise<void> {
    if (!this.valid() || this.saving()) return;

    this.saving.set(true);

    const row = {
      name: this.name().trim(),
      price: Math.round(this.price() * 100) / 100,
      category: this.category()!,
      available: this.available()
    };

    try {
      if (this.isNew()) {
        await this.data.insert(this.data.productStore, row);
        this.notify.success(`„${ row.name }“ angelegt`);
      } else {
        await this.data.update(this.data.productStore, this.product()!.id, row);
        this.notify.success(`„${ row.name }“ gespeichert`);
      }

      await this.router.navigate([ '/admin/products' ]);
    } catch (e) {
      this.notify.error('Produkt konnte nicht gespeichert werden', e);
    } finally {
      this.saving.set(false);
    }
  }

  protected remove(): void {
    const product = this.product();
    if (!product) return;

    this.confirm.confirm({
      header: 'Produkt löschen?',
      message: `„${ product.name }“ wird endgültig gelöscht – inklusive aller bisherigen Verkäufe in der Umsatzstatistik. `
        + 'Tipp: Stattdessen als „ausverkauft“ markieren.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Endgültig löschen',
      rejectLabel: 'Abbrechen',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary' },
      accept: async () => {
        try {
          await this.data.remove(this.data.productStore, product.id);
          this.notify.success(`„${ product.name }“ gelöscht`);
          await this.router.navigate([ '/admin/products' ], { replaceUrl: true });
        } catch (e) {
          this.notify.error('Produkt konnte nicht gelöscht werden', e);
        }
      }
    });
  }
}
