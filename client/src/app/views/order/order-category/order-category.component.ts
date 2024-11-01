import { Component, EventEmitter, Input, Output } from '@angular/core';
import { OrderableItem } from '../../../models/models';

@Component({
  selector: 'app-order-category',
  templateUrl: './order-category.component.html',
  styleUrls: [ './order-category.component.scss' ]
})
export class OrderCategoryComponent {

  @Input() title!: string;
  @Input() items!: OrderableItem[];
  @Input() showPrice: boolean;

  @Output() itemsChange: EventEmitter<OrderableItem[]>;

  constructor() {
    this.itemsChange = new EventEmitter();
    this.showPrice = true;
  }

  public changeItemAmount(event: MouseEvent, item: OrderableItem): void {
    if (!item.amount) {
      item.amount = 0;
    }

    const localName = (event.target as any).localName.toString();

    if (localName === 'mat-icon') {
      item.amount = Math.max(0, --item.amount);
    } else {
      item.amount = item.amount + 1;
    }

    this.itemsChange.emit(this.items);
  }


  public formatPrice(price: number): string {
    return price.toString().replace('.', ',');
  }
}
