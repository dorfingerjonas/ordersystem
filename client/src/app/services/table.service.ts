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
    this.tables = this.db.object<Table[]>('tables').valueChanges() as Observable<Table[]>;
  }

  public update(tables: Table[]): Promise<void> {
    return this.db.object<Table[]>('tables').update(tables);
  }

  persist(tables: Table[]): Promise<void> {
    return this.db.object<Table[]>('tables').set(tables);
  }
}
