import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Food } from '../models/models';
import { AngularFireDatabase } from '@angular/fire/compat/database';

@Injectable({
  providedIn: 'root'
})
export class FoodService {

  food: Observable<Food[]>;

  constructor(private db: AngularFireDatabase) {
    this.food = this.db.object('food').valueChanges() as Observable<Food[]>;
  }

}
