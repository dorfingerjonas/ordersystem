import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { eur } from '../utils/format';
import { GroupTile } from '../utils/groups';
import { Product } from '../models/models';

/** Variant buttons of one group tile (rows x columns), used on the order screen and when cashing up. */
@Component({
  selector: 'app-variant-options',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (row of tile().rows; track row.label) {
      <div class="vrow">
        <span class="vlabel">{{ row.label }}</span>
        <div class="vgrid" [style.grid-template-columns]="'repeat(' + tile().columns + ', minmax(0, 1fr))'">
          @for (cell of row.cells; track cell.label) {
            @if (cell.product; as p) {
              @let q = quantities().get(p.id) ?? 0;
              <div class="vcell-wrap">
                <button type="button" class="vcell" [class.has]="q > 0" [class.soldout]="!p.available" (click)="pick.emit(p)"
                        [attr.aria-disabled]="!p.available"
                        [attr.aria-label]="p.name + (p.available ? ', ' + eur(p.price) + ' hinzufügen' : ', ausverkauft') + (q ? ', ' + q + ' ausgewählt' : '')">
                  <span class="vname">{{ cell.label }}</span>
                  @if (p.available) {
                    <span class="vprice">{{ eur(p.price) }}</span>
                  } @else {
                    <span class="vsold">Ausverkauft</span>
                  }
                  @if (q > 0) {
                    <span class="count-badge vq" aria-hidden="true">{{ q }}</span>
                  }
                </button>
                @if (showMinus() && q > 0) {
                  <button type="button" class="vminus" (click)="minus.emit(p)" [attr.aria-label]="p.name + ' eins weniger'">
                    <i class="pi pi-minus" aria-hidden="true"></i>
                  </button>
                }
              </div>
            } @else {
              <span class="vcell none" aria-hidden="true">
                <span class="vname">{{ cell.label }}</span>
                <span class="vprice">–</span>
              </span>
            }
          }
        </div>
      </div>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 14px; }
    .vrow { display: flex; flex-direction: column; gap: 6px; }
    .vlabel { font-size: 13px; font-weight: 700; color: var(--os-text-2); text-transform: uppercase; letter-spacing: .6px; }
    .vgrid { display: grid; gap: 8px; }
    .vcell-wrap { position: relative; display: flex; }
    .vcell {
      position: relative;
      width: 100%;
      min-height: 72px;
      border-radius: var(--os-radius);
      border: 1.5px solid var(--os-border);
      background: var(--os-card);
      color: var(--os-text);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      padding: 6px 4px;
      cursor: pointer;
      text-align: center;
    }
    .vcell:active { transform: scale(.97); }
    .vcell.has { background: var(--os-primary-soft); border: 2px solid var(--os-primary-strong); }
    .vcell.soldout { background: var(--os-card-soft); border-style: dashed; color: var(--os-faint); }
    .vcell.soldout .vname { text-decoration: line-through; }
    .vcell.none { background: transparent; border-style: dashed; color: var(--os-faint); cursor: default; }
    .vname { font-size: 16px; font-weight: 700; line-height: 1.15; overflow-wrap: anywhere; }
    .vprice { font-size: 13px; color: var(--os-text-2); }
    .vcell.none .vprice { color: var(--os-faint); }
    .vsold { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--os-danger); }
    .vq { position: absolute; top: 6px; right: 6px; min-width: 22px; height: 22px; font-size: 12px; }
    .vminus {
      position: absolute;
      top: 4px;
      left: 4px;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 8px;
      background: var(--os-primary-softer);
      color: var(--os-text);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .vminus i { font-size: 12px; font-weight: 800; }
  `
})
export class VariantOptionsComponent {

  protected readonly eur = eur;

  public readonly tile = input.required<GroupTile>();
  public readonly quantities = input<Map<number, number>>(new Map());
  public readonly showMinus = input(false);

  public readonly pick = output<Product>();
  public readonly minus = output<Product>();
}
