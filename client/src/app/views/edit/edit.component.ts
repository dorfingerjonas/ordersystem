import { Component, OnInit } from '@angular/core';
import { Drink, Food, Table } from '../../models/models';
import { DrinkService } from '../../services/drink.service';
import { FoodService } from '../../services/food.service';
import { HeaderService } from '../../services/header.service';
import { TableService } from '../../services/table.service';

@Component({
  selector: 'app-edit',
  templateUrl: './edit.component.html',
  styleUrls: [ './edit.component.scss' ]
})
export class EditComponent implements OnInit {

  public displayDrinks: Drink[] = [];
  public displayFood: Food[] = [];
  public displayTables: Table[] = [];

  public searchValue = '';

  private drinks: Drink[] = [];
  private food: Food[] = [];
  private tables: Table[] = [];

  constructor(private drinkService: DrinkService,
              private foodService: FoodService,
              private tableService: TableService,
              private readonly header: HeaderService) {
    setTimeout(() => {
      this.header.text = 'Inhalte Bearbeiten';
    }, 50);
    this.drinkService.drinks.subscribe(drinks => {
      this.drinks = drinks || [];
      console.log(this.drinks);
      this.displayDrinks = this.drinks;
    });

    this.foodService.food.subscribe(food => {
      this.food = food || [];
      this.displayFood = this.food;
    });

    this.tableService.tables.subscribe(tables => {
      this.tables = (tables || []).sort((a, b) => a.nr.localeCompare(b.nr));
      this.displayTables = this.tables;
    });
  }

  ngOnInit(): void {
  }

  search(): void {
    if (this.searchValue.trim() !== '') {
      this.displayDrinks = this.drinks.filter(drink => drink.name.toLowerCase().includes(this.searchValue.toLowerCase()));
      this.displayFood = this.food.filter(food => food.name.toLowerCase().includes(this.searchValue.toLowerCase()));
      this.displayTables = this.tables.filter(table => table.nr.toLowerCase().includes(this.searchValue.toLowerCase()));
    } else {
      this.displayDrinks = this.drinks;
      this.displayFood = this.food;
      this.displayTables = this.tables;
    }
  }

  public updateTables(): void {
    this.tableService.update(this.displayTables);
  }

  addTable(): void {
    this.displayTables.push({
      nr: ''
    });
  }

  deleteTable(table: Table): void {
    this.displayTables = this.displayTables.filter(t => t.nr !== table.nr);
    this.tableService.persist(this.displayTables);
  }

  updateDrinks(): void {
    this.drinkService.update(this.displayDrinks);
  }

  addDrink(): void {
    this.displayDrinks.push({
      id: Date.now(),
      name: '',
      category: 'alcohol',
      price: 0
    });
  }

  deleteDrink(drink: Drink): void {
    this.displayDrinks = this.displayDrinks.filter(d => d.id !== drink.id);
    this.drinkService.persist(this.displayDrinks);
  }

  changeCategory(drink: Drink, category: 'alcohol' | 'anti'): void {
    drink.category = category;
  }

  updateFood(): void {
    this.foodService.update(this.displayFood);
  }

  deleteFood(food: Food): void {
    this.displayFood = this.displayFood.filter(f => f.id !== food.id);
    this.foodService.persist(this.displayFood);
  }

  addFood(): void {
    this.displayFood.push({
      id: Date.now(),
      name: '',
      price: 0
    });
  }
}
