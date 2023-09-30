import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/database';
import { Observable } from 'rxjs';
import { Drink } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class DrinkService {

  drinks: Observable<Drink[]>;

  constructor(private db: AngularFireDatabase) {
    this.drinks = this.db.object('drinks').valueChanges() as Observable<Drink[]>;
  }

  update(drinks: Drink[]): Promise<void> {
    return this.db.object<Drink[]>('drinks').update(drinks);
  }

  persist(drinks: Drink[]): Promise<void> {
    return this.db.object<Drink[]>('drinks').set(drinks);
  }
}
