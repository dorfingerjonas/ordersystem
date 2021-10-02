import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { faMinus as minusIcon } from '@fortawesome/free-solid-svg-icons';
import { Drink, Food } from '../../models/models';
import { DrinkService } from '../../services/drink.service';
import { FoodService } from '../../services/food.service';
import { HeaderService } from '../../services/header.service';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-order',
  templateUrl: './order.component.html',
  styleUrls: [ './order.component.scss' ]
})
export class OrderComponent implements OnInit {

  displayTable: { title: string; items: Drink[] | Food[] } [];
  minusIcon = minusIcon;
  private drinks: Drink[];
  private food: Food[];

  constructor(private router: Router,
              private loading: LoadingService,
              private header: HeaderService,
              private drinkService: DrinkService,
              private foodService: FoodService) {
    this.displayTable = [];
    this.drinks = [];
    this.food = [];
  }

  ngOnInit(): void {
    setTimeout(() => this.header.text = `Tisch: ${ this.router.url.replace('/order/', '') }`);

    this.drinkService.drinks.subscribe(drinks => {
      this.drinks = drinks;

      this.buildDisplayTable();
    });

    this.foodService.food.subscribe(food => {
      this.food = food;

      this.buildDisplayTable();
    });
  }

  decreaseAmount(item: Drink | Food): void {
    if (item.amount) {
      if (item.amount > 0) {
        console.log(item.amount);
        item.amount = item.amount - 2;
        console.log(item.amount);
      }
    }
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
