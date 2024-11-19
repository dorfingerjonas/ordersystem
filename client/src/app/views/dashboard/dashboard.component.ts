import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DataService } from '../../services/data.service';
import { HeaderService } from '../../services/header.service';
import { Drink, Food, OrderableItem } from '../../models/models';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: [ './dashboard.component.scss' ]
})
export class DashboardComponent {

  public saleVolume: number;
  private food: Food[];
  private drinks: Drink[];

  constructor(private readonly route: ActivatedRoute,
              private readonly data: DataService,
              private readonly header: HeaderService) {
    this.food = [];
    this.drinks = [];

    this.header.text = 'Dashboard';

    this.data.fetchData();

    this.saleVolume = 0;

    this.data.food.subscribe(f => this.food = f);
    this.data.drinks.subscribe(d => this.drinks = d);

    this.data.orders.subscribe(orders => {
      const items: OrderableItem[] = [ ...this.food, ...this.drinks ];

      if (!(orders && orders.length > 0)) return;

      this.saleVolume = orders.map(o => {
        const item: OrderableItem | undefined = items.find(i => i.id === o.itemId);

        if (item) {
          return {
            id: item.id,
            amount: o.amount,
            name: item.name,
            price: item.price
          } as OrderableItem;
        }

        return {
          id: -1,
          amount: 0,
          name: '',
          price: 0
        } as OrderableItem;
      }).reduce((totalCost, item) => {
        return totalCost + item.price * item.amount!;
      }, 0);
    });
  }

}
