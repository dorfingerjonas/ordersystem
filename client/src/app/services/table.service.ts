import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Table } from '../models/models';
import { AngularFireDatabase } from '@angular/fire/compat/database';

@Injectable({
  providedIn: 'root'
})
export class TableService {

  tables: Observable<Table[]>;

  constructor(private db: AngularFireDatabase) {
    this.tables = this.db.object('tables').valueChanges() as Observable<Table[]>;
  }

}
