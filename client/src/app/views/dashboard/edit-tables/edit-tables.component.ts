import { Component } from '@angular/core';
import { Table } from '../../../models/models';
import { DataService } from '../../../services/data.service';
import { HeaderService } from '../../../services/header.service';
import { MatDialog } from '@angular/material/dialog';
import { TablePopupComponent } from './table-popup/table-popup.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-edit-tables',
  templateUrl: './edit-tables.component.html',
  styleUrls: [ './edit-tables.component.scss' ]
})
export class EditTablesComponent {

  public tables: Table[];
  public loaded: boolean;

  constructor(private readonly data: DataService,
              private readonly header: HeaderService,
              private readonly dialog: MatDialog,
              private readonly snackBar: MatSnackBar) {
    this.tables = [];
    this.loaded = false;

    this.data.tables.subscribe(tables => {
      this.tables = tables.sort((a, b) => a.ordering - b.ordering);
      this.loaded = true;
    });

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
          this.data.upsert<Table>('tables', { ...newTable });
        }
      }
    });
  }

  public delete(table: Table): void {
    this.data.delete('tables', table.id);
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
          this.data.upsert('tables', { ...table, nr: newTable.nr }).then(res => {
            const { data, error } = res;

            if (error) {
              this.snackBar.open('Fehler beim Speichern', 'X', { duration: 2500 });
            } else {
              this.snackBar.open('Tisch gespeichert', 'X', { duration: 2500 });
            }
          });
        }
      }
    });
  }

  public drop(event: CdkDragDrop<any, any>): void {
    moveItemInArray(this.tables, event.previousIndex, event.currentIndex);

    const tablesToUpdate: Table[] = [];

    this.tables = this.tables.map((t, i) => {
      const newTable = { ...t, ordering: i + 1 };

      if (t.ordering !== newTable.ordering) {
        tablesToUpdate.push(newTable);
      }

      return newTable;
    });

    tablesToUpdate.forEach(t => {
      this.data.upsert<Table>('tables', { ...t });
    });
  }
}
