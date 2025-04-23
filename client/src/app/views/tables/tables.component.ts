import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { HeaderService } from '../../services/header.service';
import { LoadingService } from '../../services/loading.service';
import { Table } from '../../models/models';
import { DataService } from '../../services/data.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tables',
  templateUrl: './tables.component.html',
  styleUrls: [ './tables.component.scss' ]
})
export class TablesComponent implements OnDestroy {

  public tables: Table[] | null;
  private subscriptions: Subscription[] = [];

  constructor(private header: HeaderService,
              private data: DataService,
              private loading: LoadingService,
              private router: Router) {
    this.tables = null;

    this.header.text = 'Tischauswahl';

    this.data.fetchData();

    this.loading.activateLoading();

    const sub = this.data.tables.subscribe(tables => {
      this.tables = tables.sort((a, b) => a.ordering - b.ordering);
      this.loading.deactivateLoading();

      this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      });
    });

    this.subscriptions.push(sub);
  }

  public ngOnDestroy(): void {
    this.subscriptions.forEach(value => value.unsubscribe());
  }
}
