import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Drink, Food, Table } from '../models/models';
import { AngularFireDatabase } from '@angular/fire/compat/database';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  tables: Observable<Table[]>;
  drinks: Observable<Drink[]>;
  food: Observable<Food[]>;

  constructor(private db: AngularFireDatabase) {
    this.tables = this.db.object<Table[]>('tables').valueChanges() as Observable<Table[]>;
    this.drinks = this.db.object('drinks').valueChanges() as Observable<Drink[]>;
    this.food = this.db.object('food').valueChanges() as Observable<Food[]>;
  }

  public updateTables(tables: Table[]): Promise<void> {
    return this.db.object<Table[]>('tables').update(tables);
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
}
