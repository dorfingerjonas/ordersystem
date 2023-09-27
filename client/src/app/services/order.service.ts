import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/database';
import firebase from 'firebase';
import { Order } from '../models/models';
import Reference = firebase.database.Reference;

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  constructor(private db: AngularFireDatabase) {
  }

  persist(order: Order): Promise<Reference> {
    return new Promise((resolve, reject) => {
      this.db.list('orders').push(order)
        .then(res => resolve(res))
        .catch(err => reject(err));
    });
  }
}
