import { Component } from '@angular/core';
import { Table } from '../../../models/models';
import { DataService } from '../../../services/data.service';
import { HeaderService } from '../../../services/header.service';
import { MatDialog } from '@angular/material/dialog';
import { TablePopupComponent } from './table-popup/table-popup.component';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-edit-tables',
  templateUrl: './edit-tables.component.html',
  styleUrls: [ './edit-tables.component.scss' ]
})
export class EditTablesComponent {

  public tables: Table[];
  public tablesHashed: string;
  public loaded: boolean;

  constructor(private readonly data: DataService,
              private readonly header: HeaderService,
              private readonly dialog: MatDialog,
              private readonly snackBar: MatSnackBar) {
    this.tables = [];
    this.loaded = false;

    this.data.tables.subscribe(tables => {
      this.tables = tables;
      this.tablesHashed = this.hash(tables);
      this.loaded = true;
    });
    this.tablesHashed = '';

    this.data.fetchData();

    this.header.text = 'Tische bearbeiten';
  }

  public create(): void {
    this.dialog.open(TablePopupComponent, { data: null }).afterClosed().subscribe((newTable: Table | null) => {
      if (newTable) {
        // check if table already exists
        if (this.tables.find(t => t.nr === newTable.nr)) {
          // table exists => do nothing
          this.snackBar.open(`Tisch ${ newTable.nr } existiert bereits`, 'X', { duration: 2500 });
        } else {
          // table does not exist => add
          this.tables.push(newTable);
        }
      }
    });
  }

  public delete(table: Table): void {
    this.tables = this.tables.filter(t => t.nr != table.nr);
  }

  public edit(table: Table): void {
    this.dialog.open(TablePopupComponent, { data: table }).afterClosed().subscribe((newTable: Table | null) => {
      if (newTable) {
        // check if table already exists
        if (this.tables.find(t => t.nr === newTable.nr)) {
          // table exists => do nothing
          this.snackBar.open(`Tisch ${ newTable.nr } existiert bereits`, 'X', { duration: 2500 });
        } else {
          // table does not exist => edit
          const index = this.tables.findIndex(t => t.nr === table.nr);

          // check if index is valid
          if (index >= 0 && index < this.tables.length) {
            this.tables[index] = newTable;
          }
        }
      }
    });
  }

  public save(): void {
    this.data.persistTables(this.tables).then(() => {
      this.tablesHashed = this.hash(this.tables);
      this.snackBar.open(`${ this.tables.length } Tische wurden gespeichert`, 'X', { duration: 2500 });
    });
  }

  public hash(tables: Table[]): string {
    return btoa(JSON.stringify(tables));
  }
}
