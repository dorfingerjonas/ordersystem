import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Drink } from '../models/models';
import { AngularFireDatabase } from '@angular/fire/compat/database';

@Injectable({
  providedIn: 'root'
})
export class DrinkService {

  drinks: Observable<Drink[]>;

  constructor(private db: AngularFireDatabase) {
    this.drinks = this.db.object('drinks').valueChanges() as Observable<Drink[]>;
  }

}
