import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { HeaderService } from '../../services/header.service';
import { LoadingService } from '../../services/loading.service';
import { Table } from '../../models/models';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-tables',
  templateUrl: './tables.component.html',
  styleUrls: [ './tables.component.scss' ]
})
export class TablesComponent implements OnInit, OnDestroy {

  tables: Table[];
  private subscriptions: Subscription[] = [];

  constructor(private header: HeaderService,
              private dataService: DataService,
              private loading: LoadingService) {
    this.tables = [];

    this.loading.activateLoading();
  }

  ngOnInit(): void {
    setTimeout(() => this.header.text = 'Tischauswahl');

    const sub = this.dataService.tables.subscribe(tables => {
      this.tables = tables.sort((a, b) => a.nr.localeCompare(b.nr));
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
