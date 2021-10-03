import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/database';
import { Observable } from 'rxjs';
import { Table } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class TableService {

  tables: Observable<Table[]>;

  constructor(private db: AngularFireDatabase) {
    this.tables = this.db.object('tables').valueChanges() as Observable<Table[]>;
  }
}
