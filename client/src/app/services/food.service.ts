import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/database';
import { Observable } from 'rxjs';
import { Food } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class FoodService {

  food: Observable<Food[]>;

  constructor(private db: AngularFireDatabase) {
    this.food = this.db.object('food').valueChanges() as Observable<Food[]>;
  }

  update(food: Food[]): Promise<void> {
    return this.db.object<Food[]>('food').update(food);
  }

  persist(food: Food[]): Promise<void> {
    return this.db.object<Food[]>('food').set(food);
  }
}
