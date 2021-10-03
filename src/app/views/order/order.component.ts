import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { faMinus as minusIcon } from '@fortawesome/free-solid-svg-icons';
import { Subscription } from 'rxjs';
import { Drink, Food, Order } from '../../models/models';
import { AuthService } from '../../services/auth.service';
import { DrinkService } from '../../services/drink.service';
import { FoodService } from '../../services/food.service';
import { HeaderService } from '../../services/header.service';
import { LoadingService } from '../../services/loading.service';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-order',
  templateUrl: './order.component.html',
  styleUrls: [ './order.component.scss' ]
})
export class OrderComponent implements OnInit, OnDestroy {

  displayTable: { title: string; items: Drink[] | Food[] } [];
  minusIcon = minusIcon;
  tableNr: number;
  private drinks: Drink[];
  private food: Food[];
  private subscriptions: Subscription[] = [];

  constructor(private router: Router,
              private loading: LoadingService,
              private header: HeaderService,
              private drinkService: DrinkService,
              private foodService: FoodService,
              private orderService: OrderService,
              private auth: AuthService) {
    this.displayTable = [];
    this.drinks = [];
    this.food = [];
    this.tableNr = parseInt(this.router.url.replace('/order/', ''), 0);
  }

  ngOnInit(): void {
    setTimeout(() => this.header.text = `Tisch: ${ this.tableNr }`);

    let sub = this.drinkService.drinks.subscribe(drinks => {
      this.drinks = drinks;

      this.buildDisplayTable();
    });

    this.subscriptions.push(sub);

    sub = this.foodService.food.subscribe(food => {
      this.food = food;

      this.buildDisplayTable();
    });

    this.subscriptions.push(sub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(value => {
      value.unsubscribe();
    });
  }

  decreaseAmount(item: Drink | Food): void {
    if (item.amount) {
      if (item.amount > 0) {
        item.amount = item.amount - 2;
      }
    }
  }

  order(): void {
    const order: Order = {
      id: Date.now(),
      drinks: this.drinks.filter(drink => (drink.amount || 0) > 0),
      food: this.food.filter(food => (food.amount || 0) > 0),
      table: {
        nr: this.tableNr
      },
      timestamp: Date.now(),
      waiter: this.auth.username
    };

    this.loading.activateLoading();

    this.orderService.persist(order).then(value => {
      this.loading.deactivateLoading();

      this.router.navigateByUrl('/tables');
    }).catch(reason => {
      this.loading.deactivateLoading();
    });
  }

  private buildDisplayTable(): void {
    this.displayTable = [
      {
        title: 'alkoholische Getränke',
        items: this.drinks.filter(drink => drink.category === 'alcohol')
      },
      {
        title: 'alkoholfreie Getränke',
        items: this.drinks.filter(drink => drink.category === 'anti')
      },
      {
        title: 'Speisen',
        items: this.food
      }
    ];

    this.loading.deactivateLoading();
  }

  isOrderValid(): boolean {
    const drinks = this.drinks.filter(drink => (drink.amount || 0) > 0);
    const food = this.food.filter(f => (f.amount || 0) > 0);

    return drinks.length > 0 || food.length > 0;
  }
}
