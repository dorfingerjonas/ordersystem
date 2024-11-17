import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CompletedOrderDTO, CompletedOrderItem, Drink, Food, OpenOrder, Order, Table } from '../models/models';
import { AngularFireDatabase } from '@angular/fire/compat/database';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  public tables: BehaviorSubject<Table[]>;
  public drinks: BehaviorSubject<Drink[]>;
  public food: BehaviorSubject<Food[]>;
  public orders: BehaviorSubject<Order[]>;
  public openOrders: BehaviorSubject<OpenOrder[]>;

  constructor(private db: AngularFireDatabase) {
    this.tables = new BehaviorSubject<Table[]>([]);
    this.drinks = new BehaviorSubject<Drink[]>([]);
    this.food = new BehaviorSubject<Food[]>([]);
    this.orders = new BehaviorSubject<Order[]>([]);
    this.openOrders = new BehaviorSubject<OpenOrder[]>([]);

    this.db.list<Table>('tables').valueChanges().subscribe(t => this.tables.next(t || []));
    this.db.list<Drink>('drinks').valueChanges().subscribe(d => this.drinks.next(d || []));
    this.db.list<Food>('food').valueChanges().subscribe(f => this.food.next(f || []));
    this.db.list<Order>('orders').valueChanges().subscribe(o => this.orders.next(o || []));
    this.db.object<CompletedOrderDTO[]>('completed-orders').valueChanges().subscribe(o => {
      if (!o) return;

      const openOrders: OpenOrder[] = [];
      for (const tableNr in o) {
        const tableOrders: CompletedOrderItem[] = [];

        for (const key in o[tableNr]) {
          tableOrders.push(o[tableNr][key] as CompletedOrderItem);
        }

        const order: OpenOrder = {
          nr: tableNr.toString(),
          openItems: tableOrders.filter(i => !i.paid)
        };

        console.log(order);

        if (order.openItems.length > 0) {
          openOrders.push(order);
        }

        this.openOrders.next(openOrders);
      }
    });

    this.fetchData();
  }

  public createOrder(order: Order): Promise<firebase.default.database.Reference> {
    return new Promise((resolve, reject) => {
      this.db.list('pending-orders').push(order)
        .then(res => resolve(res))
        .catch(err => reject(err));
    });
  }

  public persistTables(tables: Table[]): Promise<void> {
    return this.db.object<Table[]>('tables').set(tables);
  }

  public persistDrinks(drinks: Drink[]): Promise<void> {
    return this.db.object<Drink[]>('drinks').set(drinks);
  }

  public persistFood(food: Food[]): Promise<void> {
    return this.db.object<Food[]>('food').set(food);
  }

  public persistCompletedOrderItem(tableNr: string, items: CompletedOrderItem[]): Promise<void> {
    return this.db.object(`completed-orders/${ tableNr }`).set(items);
  }

  public fetchData(): void {
    this.tables.next(this.tables.value);
    this.drinks.next(this.drinks.value);
    this.food.next(this.food.value);
    this.orders.next(this.orders.value);
  }
}
