import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Table } from '../../models/models';
import { HeaderService } from '../../services/header.service';
import { LoadingService } from '../../services/loading.service';
import { TableService } from '../../services/table.service';

@Component({
  selector: 'app-tables',
  templateUrl: './tables.component.html',
  styleUrls: [ './tables.component.scss' ]
})
export class TablesComponent implements OnInit, OnDestroy {

  tables: Table[];
  private subscriptions: Subscription[] = [];

  constructor(private header: HeaderService,
              private tableService: TableService,
              private loading: LoadingService) {
    this.tables = [];

    this.loading.activateLoading();
  }

  ngOnInit(): void {
    setTimeout(() => this.header.text = 'Tischauswahl');

    const sub = this.tableService.tables.subscribe(tables => {
      this.tables = tables;
      this.loading.deactivateLoading();
    });

    this.subscriptions.push(sub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(value => {
      value.unsubscribe();
    });
  }
}
