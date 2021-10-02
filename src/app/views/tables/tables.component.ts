import { Component, OnInit } from '@angular/core';
import { Table } from '../../models/models';
import { HeaderService } from '../../services/header.service';
import { LoadingService } from '../../services/loading.service';
import { TableService } from '../../services/table.service';

@Component({
  selector: 'app-tables',
  templateUrl: './tables.component.html',
  styleUrls: [ './tables.component.scss' ]
})
export class TablesComponent implements OnInit {

  tables: Table[];

  constructor(private header: HeaderService,
              private tableService: TableService,
              private loading: LoadingService) {
    this.tables = [];

    this.loading.activateLoading();

    this.tableService.tables.subscribe(tables => {
      this.tables = tables;
      this.loading.deactivateLoading();
    });
  }

  ngOnInit(): void {
    setTimeout(() => this.header.text = 'Tischauswahl');
  }
}
