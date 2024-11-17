import { Component } from '@angular/core';
import { HeaderService } from '../../../services/header.service';
import { DataService } from '../../../services/data.service';
import { ActivatedRoute } from '@angular/router';
import { CompletedOrderItem, OrderableItem } from '../../../models/models';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-pay',
  templateUrl: './pay.component.html',
  styleUrls: [ './pay.component.scss' ]
})
export class PayComponent {

  public readonly selectedTableNr: string | null;
  public alcoholDrinks: OrderableItem[] | null;
  public antiDrinks: OrderableItem[] | null;
  public food: OrderableItem[] | null;
  public openItems: OrderableItem[] | null;
  private tableOpenItems: CompletedOrderItem[] | null; // not manipulated open items, with order id

  constructor(private header: HeaderService,
              private data: DataService,
              private readonly route: ActivatedRoute,
              private readonly snackBar: MatSnackBar) {
    this.selectedTableNr = this.route.snapshot.paramMap.get('tableNr');
    this.header.text = this.selectedTableNr ? `Tisch ${ this.selectedTableNr } kassieren` : 'Kassieren';

    this.data.fetchData();

    this.alcoholDrinks = null;
    this.antiDrinks = null;
    this.food = null;
    this.openItems = null;
    this.tableOpenItems = null;

    this.data.food.subscribe(food => {
      this.food = food.map(f => {
        return { ...f, amount: 0 };
      });
    });

    this.data.drinks.subscribe(drinks => {
      this.alcoholDrinks = [];
      this.antiDrinks = [];

      for (const drink of drinks) {
        if (drink.category === 'alcohol') {
          this.alcoholDrinks.push({ ...drink, amount: 0 });
        } else if (drink.category === 'anti') {
          this.antiDrinks.push({ ...drink, amount: 0 });
        } else {
          throw new Error('Invalid Drink category ' + drink.category);
        }
      }
    });

    if (this.selectedTableNr) {
      this.data.openOrders.subscribe(orders => {
        if (!this.food || !this.antiDrinks || !this.alcoholDrinks) return;

        const index = orders.findIndex(o => o.nr === this.selectedTableNr);

        if (index === -1) {
          return;
        }

        const openItems = orders[index].openItems;
        this.tableOpenItems = openItems;
        this.openItems = [];

        openItems.forEach(item => {
          const openItem = [ ...this.food!, ...this.alcoholDrinks!, ...this.antiDrinks! ].find(i => i.id === item.itemId);

          if (openItem) {
            this.openItems?.push({ ...openItem, amount: item.amount });
          }
        });
      });
    }
  }

  public getCartSummary(): { drinks: OrderableItem[], food: OrderableItem[], sum: number } | null {
    if (this.antiDrinks === null || this.alcoholDrinks === null || this.food === null) {
      return null;
    }

    const summary = {
      drinks: [
        ...this.alcoholDrinks.filter(d => (d.amount || 0) > 0),
        ...this.antiDrinks.filter(d => (d.amount || 0) > 0)
      ],
      food: this.food.filter(f => (f.amount || 0) > 0),
      sum: 0
    };

    summary.sum = [ ...summary.drinks, ...summary.food ].reduce((totalCost, item) => {
      return totalCost + (item.amount || 0) * item.price;
    }, 0);

    return summary;
  }

  public formatPrice(price: number): string {
    return price.toString().replace('.', ',');
  }

  public reset(): void {
    this.food?.forEach(f => f.amount = 0);
    this.alcoholDrinks?.forEach(d => d.amount = 0);
    this.antiDrinks?.forEach(d => d.amount = 0);
    document.getElementsByClassName('page-container')[0].scrollTop = 0;
  }

  public getAccumulatedOpenItems(openItems: OrderableItem[] | null): OrderableItem[] {
    const result: OrderableItem[] = [];

    if (!openItems) return result;

    openItems.forEach(openItem => {
      if ((openItem.amount || 0) <= 0) return;
      const index = result.findIndex(r => r.id === openItem.id);

      if (index !== -1 && result[index].amount) {
        result[index].amount! += openItem.amount || 0;
      } else {
        result.push({ ...openItem });
      }
    });

    return result.sort((a, b) => (a.name.localeCompare(b.name)));
  }

  public selectOpenItem(itemId: number): void {
    if (!this.openItems || !this.antiDrinks || !this.alcoholDrinks || !this.food || !this.tableOpenItems) return;

    const index = this.openItems.findIndex(i => i.id === itemId && (i.amount || 0) > 0);

    if (index === -1) return;

    this.openItems[index].amount!--;

    let itemIndex = this.food.findIndex(f => f.id === itemId);

    if (itemIndex !== -1) {
      this.food[itemIndex].amount!++;
      return;
    }

    itemIndex = this.alcoholDrinks.findIndex(d => d.id === itemId);

    if (itemIndex !== -1) {
      this.alcoholDrinks[itemIndex].amount!++;
      return;
    }

    itemIndex = this.antiDrinks.findIndex(d => d.id === itemId);

    if (itemIndex !== -1) {
      this.antiDrinks[itemIndex].amount!++;
      return;
    }
  }

  public async complete(): Promise<void> {
    if (!this.openItems || !this.antiDrinks || !this.alcoholDrinks || !this.food || !this.tableOpenItems || !this.selectedTableNr) return;

    const openItems: CompletedOrderItem[] = [];

    const allItems = [ ...this.food!, ...this.antiDrinks!, ...this.alcoholDrinks! ];

    this.tableOpenItems.forEach(item => {
      const findItemIndex = allItems.findIndex(i => i.id === item.itemId);

      if (findItemIndex !== -1 && (allItems[findItemIndex].amount || 0) > 0) {
        item.paid = true;
        allItems[findItemIndex].amount!--;
      }

      openItems.push(item);
    });

    this.data.persistCompletedOrderItem(this.selectedTableNr!, openItems);

    this.snackBar.open('Bezahlvorgang erfolgreich abgeschlossen!', 'X', { duration: 2500 });

    this.reset();
  }
}
