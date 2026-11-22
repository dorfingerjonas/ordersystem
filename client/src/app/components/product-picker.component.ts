import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { CatalogEntry, catalogTiles, DataService, OrderTile } from '../services/data.service';
import { eur } from '../utils/format';
import { GroupTile } from '../utils/groups';
import { Product } from '../models/models';
import { VariantOptionsComponent } from './variant-options.component';
import { FitTextDirective } from '../utils/fit-text.directive';

/** Category tabs + product grid, used for direct sale and "Weitere Produkte" on the pay screen. */
@Component({
  selector: 'app-product-picker',
  imports: [ FitTextDirective, VariantOptionsComponent ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (openTile(); as tile) {
      <div class="variant-head">
        <button type="button" class="icon-btn back" (click)="openKey.set(null)" aria-label="Zurück zur Produktauswahl">
          <i class="pi pi-chevron-left" aria-hidden="true"></i>
        </button>
        <strong>{{ tile.title }}</strong>
      </div>
      <app-variant-options [tile]="tile" [quantities]="quantities()" (pick)="pickVariant($event)" />
    } @else {
      <div class="seg" role="toolbar" aria-label="Kategorien">
        @for (c of categories(); track c.id) {
          <button type="button" [attr.aria-pressed]="c.id === active()" (click)="selected.set(c.id)">{{ c.name }}</button>
        }
      </div>
      <div class="grid">
        @for (t of tiles(); track t.key) {
          @if (t.kind === 'group') {
            @let gq = groupQty(t.tile);
            <button type="button" class="tile" [class.has]="gq > 0" (click)="openKey.set(t.key)"
                    [attr.aria-label]="t.tile.title + ', Variante wählen' + (gq ? ', ' + gq + ' ausgewählt' : '')">
              <span class="name" appFitText>{{ t.tile.title }}</span>
              <span class="price">{{ t.tile.variants.length }} {{ t.tile.variants.length === 1 ? 'Variante' : 'Varianten' }}
                <i class="pi pi-chevron-right" aria-hidden="true"></i></span>
              @if (gq > 0) {
                <span class="count-badge q">{{ gq }}</span>
              }
            </button>
          } @else {
            @let p = t.product;
            @let q = quantities().get(p.id) ?? 0;
            <button type="button" class="tile" [class.has]="q > 0" (click)="pick.emit(p)"
                    [attr.aria-label]="p.name + ' hinzufügen' + (q ? ', ' + q + ' ausgewählt' : '')">
              <span class="name" appFitText>{{ p.name }}</span>
              <span class="price">{{ eur(p.price) }}</span>
              @if (q > 0) {
                <span class="count-badge q">{{ q }}</span>
              }
            </button>
          }
        } @empty {
          <div class="empty span"><strong>Keine Produkte verfügbar</strong></div>
        }
      </div>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; }
    .seg { margin: 0 0 12px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    @media (min-width: 560px) { .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @media (min-width: 768px) { .grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
    .span { grid-column: 1 / -1; }
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
    .name { font-size: 15px; font-weight: 600; line-height: 1.2; padding-right: 26px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .price { white-space: nowrap; }
    .price { font-size: 13px; color: var(--os-muted); display: flex; align-items: center; gap: 4px; }
    .price i { font-size: 11px; }
    .q { position: absolute; top: 8px; right: 8px; }
    .variant-head { display: flex; align-items: center; gap: 8px; margin: -4px 0 12px; }
    .variant-head strong { font-size: 18px; font-weight: 800; }
  `
})
export class ProductPickerComponent {

  private readonly data = inject(DataService);
  protected readonly eur = eur;

  public readonly quantities = input<Map<number, number>>(new Map());
  public readonly pick = output<Product>();

  /** only what can be sold right now: available, not archived */
  private readonly sellable = computed(() => {
    const map = new Map<number, OrderTile[]>();

    this.data.catalogByCategory().forEach((entries, category) => {
      const tiles = catalogTiles(entries.flatMap<CatalogEntry>(e => {
        if (e.kind === 'product') return e.product.available ? [ e ] : [];
        const variants = e.variants.filter(v => v.product.available);
        return variants.length ? [ { ...e, variants } ] : [];
      }));

      if (tiles.length) map.set(category, tiles);
    });

    return map;
  });

  protected readonly categories = computed(() => this.data.categories().filter(c => this.sellable().has(c.id)));

  protected readonly selected = signal<number | null>(null);
  protected readonly active = computed(() => {
    const cats = this.categories();
    return cats.find(c => c.id === this.selected())?.id ?? cats[0]?.id ?? null;
  });

  protected readonly tiles = computed(() => this.sellable().get(this.active() ?? -1) ?? []);

  protected readonly openKey = signal<string | null>(null);
  protected readonly openTile = computed<GroupTile | null>(() => {
    const key = this.openKey();
    if (key === null) return null;

    for (const tiles of this.sellable().values()) {
      const tile = tiles.find(t => t.key === key);
      if (tile?.kind === 'group') return tile.tile;
    }

    return null;
  });

  protected groupQty(tile: GroupTile): number {
    const q = this.quantities();
    return tile.variants.reduce((s, v) => s + (q.get(v.product.id) ?? 0), 0);
  }

  protected pickVariant(product: Product): void {
    this.pick.emit(product);
    this.openKey.set(null);
  }
}
