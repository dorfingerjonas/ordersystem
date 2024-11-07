import { Component } from '@angular/core';
import { Food } from '../../../models/models';
import { DataService } from '../../../services/data.service';
import { HeaderService } from '../../../services/header.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FoodPopupComponent } from './food-popup/food-popup.component';

@Component({
  selector: 'app-edit-food',
  templateUrl: './edit-food.component.html',
  styleUrls: [ './edit-food.component.scss' ]
})
export class EditFoodComponent {

  public food: Food[];
  public foodHashed: string;
  public loaded: boolean;

  constructor(private readonly data: DataService,
              private readonly header: HeaderService,
              private readonly dialog: MatDialog,
              private readonly snackBar: MatSnackBar) {
    this.food = [];
    this.loaded = false;

    this.data.food.subscribe(food => {
      this.food = food;
      this.foodHashed = this.hash(food);
      this.loaded = true;
    });

    this.foodHashed = '';

    this.data.fetchData();

    this.header.text = 'Speisen bearbeiten';
  }

  public create(): void {
    this.dialog.open(FoodPopupComponent, { data: null }).afterClosed().subscribe((newFood: Food | null) => {
      if (newFood) {
        // check if food already exists
        if (this.food.find(food => food.name === newFood.name)) {
          // food exists => do nothing
          this.snackBar.open(`Speise ${ newFood.name } existiert bereits`, 'X', { duration: 2500 });
        } else {
          // food does not exist => add
          this.food.push(newFood);
        }
      }
    });
  }

  public delete(food: Food): void {
    this.food = this.food.filter(f => f.id != food.id);
  }

  public edit(food: Food): void {
    this.dialog.open(FoodPopupComponent, { data: food }).afterClosed().subscribe((food: Food | null) => {
      if (food) {
        // check if food already exists
        const indexName = this.food
          .findIndex(f => f.name.toLowerCase().trim() === food.name.toLowerCase().trim() && f.id !== food.id);

        if (indexName != -1) {
          // food exists => do nothing
          this.snackBar.open(`Speise ${ food.name } existiert bereits`, 'X', { duration: 2500 });
          return;
        }

        const indexId = this.food.findIndex(f => f.id === food.id);
        if (indexId !== -1) {
          // edit
          this.food[indexId] = food;
        }
      }
    });
  }

  public save(): void {
    this.data.persistFood(this.food).then(() => {
      this.foodHashed = this.hash(this.food);
      this.snackBar.open(`${ this.food.length } Speisen wurden gespeichert`, 'X', { duration: 2500 });
    });
  }

  public hash(food: Food[]): string {
    return btoa(JSON.stringify(food));
  }

  public formatPrice(price: string | null): string {
    if (!price) return '0,00';
    return price.replace('.', ',');
  }
}
