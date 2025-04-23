import { Component, OnInit } from '@angular/core';
import { Table } from '../../../models/models';
import { HeaderService } from '../../../services/header.service';
import { DataService } from '../../../services/data.service';
import { LoadingService } from '../../../services/loading.service';

@Component({
  selector: 'app-pay-tables',
  templateUrl: './pay-tables.component.html',
  styleUrls: [ './pay-tables.component.scss' ]
})
export class PayTablesComponent implements OnInit {

  public openTables: Table[] | null;

  constructor(private header: HeaderService,
              private data: DataService,
              private loading: LoadingService) {
    this.openTables = null;

    this.data.fetchData();

    this.loading.activateLoading();
  }

  public ngOnInit(): void {
    setTimeout(() => this.header.text = 'Bezahlen');

    let tables: Table[] = [];

    this.data.tables.subscribe(t => tables = t);

    this.data.orderedItems.subscribe(items => {
      this.openTables = items
        .filter(i => !i.paid)
        .map(i => {
          if (isNaN(Number(i.table))) {
            return i.table;
          } else {
            return tables.find(t => t.id === Number(i.table))!;
          }
        })
        .filter((value, index, array) => value && array.findIndex(t => t && t.id === value.id)! === index) || null;

      this.loading.deactivateLoading();
    });

    this.data.fetchData();
  }

}
