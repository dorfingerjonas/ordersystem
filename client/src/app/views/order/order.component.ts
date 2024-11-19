import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Order, OrderableItem, Table } from '../../models/models';
import { DataService } from '../../services/data.service';
import { HeaderService } from '../../services/header.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-order',
  templateUrl: './order.component.html',
  styleUrls: [ './order.component.scss' ]
})
export class OrderComponent {

  public readonly selectedTableNr: string;
  public alcoholDrinks: OrderableItem[] | null;
  public antiDrinks: OrderableItem[] | null;
  public food: OrderableItem[] | null;
  public orderNotes: string | undefined;

  constructor(private readonly route: ActivatedRoute,
              private readonly data: DataService,
              private readonly header: HeaderService,
              private readonly snackBar: MatSnackBar,
              private readonly auth: AuthService) {
    this.selectedTableNr = this.route.snapshot.params['tableNr'];

    this.header.text = `Tisch ${ this.selectedTableNr }`;

    this.data.fetchData();

    this.alcoholDrinks = null;
    this.antiDrinks = null;
    this.food = null;

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
          throw new Error('Invalid Drink category' + drink.category);
        }
      }
    });
  }

  public getOrderDetails(): Order | null {
    if (this.antiDrinks === null || this.alcoholDrinks === null || this.food === null) {
      return null;
    }

    return {
      drinks: [
        ...this.alcoholDrinks.filter(d => (d.amount || 0) > 0),
        ...this.antiDrinks.filter(d => (d.amount || 0) > 0)
      ],
      food: this.food.filter(f => (f.amount || 0) > 0),
      table: {
        nr: this.selectedTableNr
      } as Table,
      waiter: this.auth.username,
      timestamp: Date.now(),
      id: Date.now(),
      note: this.orderNotes || ''
    } as Order;
  }

  public order(): void {
    const order = this.getOrderDetails();

    if (!order) return;

    this.data.createOrder(order).then(ref => {
      // order completed successfully
      this.food?.forEach(f => f.amount = 0);
      this.alcoholDrinks?.forEach(d => d.amount = 0);
      this.antiDrinks?.forEach(d => d.amount = 0);
      this.orderNotes = undefined;
      document.getElementsByClassName('page-container')[0].scrollTop = 0;
      this.snackBar.open('Bestellung erfolgreich aufgegeben.', 'X', { duration: 2500 });
    }).catch(err => {
      this.snackBar.open('Es ist ein Fehler aufgetreten.', 'X', { duration: 2500 });
      console.log(err);
    });
  }
}
