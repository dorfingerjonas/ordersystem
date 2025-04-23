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

  public tables: Table[] | null;
  private subscriptions: Subscription[] = [];

  constructor(private header: HeaderService,
              private data: DataService,
              private loading: LoadingService) {
    this.tables = null;

    this.data.fetchData();

    this.loading.activateLoading();
  }

  public ngOnInit(): void {
    setTimeout(() => this.header.text = 'Tischauswahl');

    const sub = this.data.tables.subscribe(tables => {
      this.tables = tables.sort((a, b) => a.ordering - b.ordering);
      this.loading.deactivateLoading();
    });

    this.data.fetchData();

    this.subscriptions.push(sub);
  }

  public ngOnDestroy(): void {
    this.subscriptions.forEach(value => value.unsubscribe());
  }
}
