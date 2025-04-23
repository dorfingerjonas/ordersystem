import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Category, Order, Product, Table } from '../../models/models';
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
  public products: Map<number, Product[]>;
  public categories: Category[];
  public tables: Table[];
  public orderNotes: string | undefined;
  private orderSent: boolean; // prevent send orders twice when dbl click the button

  constructor(private readonly route: ActivatedRoute,
              private readonly data: DataService,
              private readonly header: HeaderService,
              private readonly snackBar: MatSnackBar,
              private readonly auth: AuthService) {
    this.selectedTableNr = this.route.snapshot.params['tableNr'];

    this.products = new Map();
    this.categories = [];
    this.tables = [];

    this.header.text = `Tisch ${ this.selectedTableNr }`;

    this.data.categories.subscribe(categories => {
      this.categories = categories.sort((a, b) => a.ordering - b.ordering);

      this.categories.forEach(category => {
        if (!this.products.has(category.id)) {
          this.products.set(category.id, []);
        }
      });
    });

    this.data.tables.subscribe(tables => {
      console.log('Tables', tables);
      this.tables = tables;
    });

    this.data.products.subscribe(products => {
      this.products.clear();
      products
        .sort((a, b) => a.ordering - b.ordering)
        .forEach(p => {
          if (this.products.has(p.category.id)) {
            this.products.get(p.category.id)!.push(p);
          } else {
            this.products.set(p.category.id, [ p ]);
          }
        });
    });

    this.data.fetchData();

    this.orderSent = false;
  }

  public getOrderDetails(): Order | null {
    const table = this.tables.find(t => t.nr === this.selectedTableNr);

    if (!table) return null;

    return {
      products: this.getSelectedProducts().map(p => {
        return {
          id: p.id,
          amount: p!.amount!
        };
      }),
      table: table.id,
      waiter: this.auth.username,
      note: this.orderNotes || ''
    };
  }

  public order(): void {
    const order: Order | null = this.getOrderDetails();

    console.log({ order });

    if (!order) return;

    console.log(order);

    if (this.orderSent) {
      // prevent sending same order twice
      return;
    }

    this.orderSent = true;

    this.data.createOrder(order).then(ref => {
      // order completed successfully
      this.products.forEach(product => {
        product.forEach(p => p.amount = 0);
      });

      this.orderNotes = undefined;
      this.orderSent = false;
      document.getElementsByClassName('page-container')[0].scrollTop = 0;
      this.snackBar.open('Bestellung erfolgreich aufgegeben.', 'X', { duration: 2500 });
    }).catch(err => {
      this.snackBar.open('Es ist ein Fehler aufgetreten.', 'X', { duration: 2500 });
      console.log(err);
      this.orderSent = false;
    });
  }

  public getCategoriesWithProducts(): Category[] {
    return this.categories.filter(c => (this.products.get(c.id)?.length || 0) > 0);
  }

  public getSelectedProducts(): Product[] {
    const products: Product[] = [];

    this.products.forEach(product => {
      products.push(...product.filter(p => (p.amount || 0) > 0));
    });

    return products.sort((a, b) => a.category.ordering - b.category.ordering);
  }
}
