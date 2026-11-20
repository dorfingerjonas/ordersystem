import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { DataService } from '../services/data.service';
import { eur } from '../utils/format';
import { Product } from '../models/models';

/** Category tabs + product grid, used for "Weitere Produkte" on the pay screen. */
@Component({
  selector: 'app-product-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="seg" role="toolbar" aria-label="Kategorien">
      @for (c of categories(); track c.id) {
        <button type="button" [attr.aria-pressed]="c.id === active()" (click)="selected.set(c.id)">{{ c.name }}</button>
      }
    </div>
    <div class="grid">
      @for (p of products(); track p.id) {
        @let q = quantities().get(p.id) ?? 0;
        <button type="button" class="tile" [class.has]="q > 0" (click)="pick.emit(p)"
                [attr.aria-label]="p.name + ' hinzufügen' + (q ? ', ' + q + ' ausgewählt' : '')">
          <span class="name">{{ p.name }}</span>
          <span class="price">{{ eur(p.price) }}</span>
          @if (q > 0) {
            <span class="count-badge q">{{ q }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: `
    :host { display: flex; flex-direction: column; }
    .seg { margin: 0 0 12px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .tile {
      position: relative;
      height: 68px;
      border-radius: var(--os-radius);
      background: var(--os-card);
      border: 1.5px solid var(--os-border);
      padding: 0 12px;
      text-align: left;
      color: var(--os-text);
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
      cursor: pointer;
    }
    .tile:active { transform: scale(.97); }
    .tile.has { background: var(--os-primary-soft); border-color: var(--os-primary-strong); }
    .name { font-size: 15px; font-weight: 600; line-height: 1.2; padding-right: 26px; }
    .price { font-size: 13px; color: var(--os-muted); }
    .q { position: absolute; top: 8px; right: 8px; }
  `
})
export class ProductPickerComponent {

  private readonly data = inject(DataService);
  protected readonly eur = eur;

  public readonly quantities = input<Map<number, number>>(new Map());
  public readonly pick = output<Product>();

  protected readonly categories = computed(() => this.data.categories()
    .filter(c => (this.data.productsByCategory().get(c.id) ?? []).some(p => p.available)));

  protected readonly selected = signal<number | null>(null);
  protected readonly active = computed(() => {
    const cats = this.categories();
    return cats.find(c => c.id === this.selected())?.id ?? cats[0]?.id ?? null;
  });

  protected readonly products = computed(() => (this.data.productsByCategory().get(this.active() ?? -1) ?? [])
    .filter(p => p.available));
}
