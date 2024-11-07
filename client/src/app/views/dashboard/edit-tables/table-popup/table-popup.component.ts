import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Table } from '../../../../models/models';

@Component({
  selector: 'app-table-popup',
  templateUrl: './table-popup.component.html',
  styleUrls: [ './table-popup.component.scss' ]
})
export class TablePopupComponent {

  public table: Table;
  public isEdit: boolean;

  constructor(@Inject(MAT_DIALOG_DATA) public data: Table | null) {
    this.isEdit = false;

    if (data) {
      this.table = { ...data };
      this.isEdit = true;
    } else {
      this.table = {
        nr: ''
      };
    }
  }

}
