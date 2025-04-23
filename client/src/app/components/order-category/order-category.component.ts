import { Component, EventEmitter, Input, Output } from '@angular/core';
import { OpenProduct, Product } from '../../models/models';

@Component({
  selector: 'app-order-category',
  templateUrl: './order-category.component.html',
  styleUrls: [ './order-category.component.scss' ]
})
export class OrderCategoryComponent {

  @Input() title!: string;
  @Input() items!: Product[];
  @Input() showPrice: boolean;
  @Input() flipAmountAction: boolean;

  @Output() itemsChange: EventEmitter<Product[]>;

  constructor() {
    this.itemsChange = new EventEmitter();
    this.showPrice = true;
    this.flipAmountAction = false;
  }

  public changeItemAmount(event: MouseEvent, item: Product): void {
    if (!item.amount) {
      item.amount = 0;
    }

    const localName = (event.target as any).localName.toString();

    if (localName === 'mat-icon') {
      if (this.flipAmountAction) {
        item.amount = Math.min(item.amount + 1, (item as OpenProduct)?.dbIds?.length);
      } else {
        item.amount = Math.max(0, item.amount - 1);
      }
    } else {
      if (this.flipAmountAction) {
        item.amount = Math.max(0, item.amount - 1);
      } else {
        item.amount++;
      }
    }

    this.itemsChange.emit(this.items);
  }

  public formatPrice(price: number): string {
    return price.toString().replace('.', ',');
  }

  public getIcon(item: Product): string {
    if (this.flipAmountAction) {
      const openAmount = (item as OpenProduct)?.dbIds?.length;

      if ((item.amount || 0) - openAmount) {
        return 'add';
      }

      return '';
    } else {
      return 'remove';
    }
  }
}
