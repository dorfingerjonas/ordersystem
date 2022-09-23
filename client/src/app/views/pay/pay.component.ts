import { Component, OnDestroy, OnInit } from '@angular/core';
import { faMinus as minusIcon } from '@fortawesome/free-solid-svg-icons';
import { Subscription } from 'rxjs';
import { Drink, Food } from '../../models/models';
import { DrinkService } from '../../services/drink.service';
import { FoodService } from '../../services/food.service';
import { HeaderService } from '../../services/header.service';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-pay',
  templateUrl: './pay.component.html',
  styleUrls: [ './pay.component.scss' ]
})
export class PayComponent implements OnInit, OnDestroy {

  displayTable: { title: string; items: Drink[] | Food[] } [];
  minusIcon = minusIcon;
  total: number;
  givenMoney: number | undefined;
  private drinks: Drink[];
  private food: Food[];
  private subscriptions: Subscription[] = [];

  constructor(private loading: LoadingService,
              private header: HeaderService,
              private drinkService: DrinkService,
              private foodService: FoodService) {
    this.displayTable = [];
    this.drinks = [];
    this.food = [];
    this.total = 0;
  }

  ngOnInit(): void {
    setTimeout(() => this.header.text = `Bezahlen`);

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

  increaseAmount(event: any, item: Drink | Food): void {
    if (![ 'svg', 'fa-icon', 'path' ].includes(event.target.localName)) {
      item.amount = (item.amount || 0) + 1;
      this.pay();
    }
  }

  decreaseAmount(item: Drink | Food): void {
    if (item.amount && item.amount > 0) {
      item.amount = item.amount - 1;
      this.pay();
    }
  }

  pay(): void {
    let drinks: number | number[] = this.drinks
      .filter(d => (d.amount || 0) > 0)
      .map(d => d.price * (d.amount || 0));

    let food: number | number[] = this.food
      .filter(f => (f.amount || 0) > 0)
      .map(f => f.price * (f.amount || 0));

    drinks = drinks.length > 0 ? drinks.reduce((acc: number, cur: number) => acc + cur) : 0;

    food = food.length > 0 ? food.reduce((acc: number, cur: number) => acc + cur) : 0;

    this.total = food + drinks;
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
}
