import { Component } from '@angular/core';
import { Drink } from '../../../models/models';
import { DataService } from '../../../services/data.service';
import { HeaderService } from '../../../services/header.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DrinkPopupComponent } from './drink-popup/drink-popup.component';

@Component({
  selector: 'app-edit-drinks',
  templateUrl: './edit-drinks.component.html',
  styleUrls: [ './edit-drinks.component.scss' ]
})
export class EditDrinksComponent {

  public drinks: Drink[];
  public drinksHashed: string;
  public categories: ('anti' | 'alcohol')[];

  constructor(private readonly data: DataService,
              private readonly header: HeaderService,
              private readonly dialog: MatDialog,
              private readonly snackBar: MatSnackBar) {
    this.drinks = [];

    this.data.drinks.subscribe(drinks => {
      this.drinks = drinks;
      this.drinksHashed = this.hash(drinks);
    });

    this.categories = [ 'alcohol', 'anti' ];
    this.drinksHashed = '';

    this.data.fetchData();

    this.header.text = 'Getränke bearbeiten';
  }

  public create(): void {
    this.dialog.open(DrinkPopupComponent, { data: null }).afterClosed().subscribe((newDrink: Drink | null) => {
      if (newDrink) {
        // check if drink already exists
        if (this.drinks.find(t => t.name === newDrink.name)) {
          // drink exists => do nothing
          this.snackBar.open(`Getränk ${ newDrink.name } existiert bereits`, 'X', { duration: 2500 });
        } else {
          // drink does not exist => add
          this.drinks.push(newDrink);
        }
      }
    });
  }

  public delete(drink: Drink): void {
    this.drinks = this.drinks.filter(t => t.id != drink.id);
  }

  public edit(drink: Drink): void {
    this.dialog.open(DrinkPopupComponent, { data: drink }).afterClosed().subscribe((drink: Drink | null) => {
      if (drink) {
        // check if drink already exists
        const indexName = this.drinks.findIndex(t => t.name.toLowerCase().trim() === drink.name.toLowerCase().trim()
          && t.id !== drink.id);

        if (indexName != -1) {
          // drink exists => do nothing
          this.snackBar.open(`Getränk ${ drink.name } existiert bereits`, 'X', { duration: 2500 });
          return;
        }

        const indexId = this.drinks.findIndex(t => t.id === drink.id);
        if (indexId !== -1) {
          // edit
          this.drinks[indexId] = drink;
        }
      }
    });
  }

  public save(): void {
    this.data.persistDrinks(this.drinks).then(() => {
      this.drinksHashed = this.hash(this.drinks);
      this.snackBar.open(`${ this.drinks.length } Getränke wurden gespeichert`, 'X', { duration: 2500 });
    });
  }

  public hash(drinks: Drink[]): string {
    return btoa(JSON.stringify(drinks));
  }

  public formatPrice(price: string | null): string {
    if (!price) return '0,00';
    return price.replace('.', ',');
  }

  public getFilteredDrinks(category: 'anti' | 'alcohol'): Drink[] {
    return this.drinks.filter(d => d.category === category);
  }
}
