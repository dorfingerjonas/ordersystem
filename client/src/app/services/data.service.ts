import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Drink, Food, Order, Table } from '../models/models';
import { AngularFireDatabase } from '@angular/fire/compat/database';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  tables: BehaviorSubject<Table[]>;
  drinks: BehaviorSubject<Drink[]>;
  food: BehaviorSubject<Food[]>;
  orders: BehaviorSubject<Order[]>;

  constructor(private db: AngularFireDatabase) {
    this.tables = new BehaviorSubject<Table[]>([]);
    this.drinks = new BehaviorSubject<Drink[]>([]);
    this.food = new BehaviorSubject<Food[]>([]);
    this.orders = new BehaviorSubject<Order[]>([]);

    this.db.list<Table>('tables').valueChanges().subscribe(t => this.tables.next(t || []));
    this.db.list<Drink>('drinks').valueChanges().subscribe(d => this.drinks.next(d || []));
    this.db.list<Food>('food').valueChanges().subscribe(f => this.food.next(f || []));
    this.db.list<Order>('orders').valueChanges().subscribe(o => this.orders.next(o || []));

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

  public updateDrinks(drinks: Drink[]): Promise<void> {
    return this.db.object<Drink[]>('drinks').update(drinks);
  }

  public persistDrinks(drinks: Drink[]): Promise<void> {
    return this.db.object<Drink[]>('drinks').set(drinks);
  }

  public updateFood(food: Food[]): Promise<void> {
    return this.db.object<Food[]>('food').update(food);
  }

  public persistFood(food: Food[]): Promise<void> {
    return this.db.object<Food[]>('food').set(food);
  }

  public fetchData(): void {
    this.tables.next(this.tables.value);
    this.drinks.next(this.drinks.value);
    this.food.next(this.food.value);
    this.orders.next(this.orders.value);
  }
}
