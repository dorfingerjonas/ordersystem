import { Injectable } from '@angular/core';
import { Order } from '../models/models';
import { AngularFireDatabase } from '@angular/fire/compat/database';

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  constructor(private db: AngularFireDatabase) {
  }

  persist(order: Order): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.list('orders').push(order)
        .then(res => resolve(res))
        .catch(err => reject(err));
    });
  }

}
