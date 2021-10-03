import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/database';
import { Order } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  constructor(private db: AngularFireDatabase) {
  }

  persist(order: Order): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(order);

      this.db.list('orders').push(order)
        .then(res => resolve())
        .catch(err => reject());
    });
  }
}
