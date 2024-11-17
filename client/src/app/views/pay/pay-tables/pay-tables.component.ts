import { Component, OnInit } from '@angular/core';
import { OpenOrder } from '../../../models/models';
import { HeaderService } from '../../../services/header.service';
import { DataService } from '../../../services/data.service';
import { LoadingService } from '../../../services/loading.service';

@Component({
  selector: 'app-pay-tables',
  templateUrl: './pay-tables.component.html',
  styleUrls: [ './pay-tables.component.scss' ]
})
export class PayTablesComponent implements OnInit {

  public orders: OpenOrder[] | null;

  constructor(private header: HeaderService,
              private data: DataService,
              private loading: LoadingService) {
    this.orders = null;

    this.data.fetchData();

    this.loading.activateLoading();
  }

  public ngOnInit(): void {
    setTimeout(() => this.header.text = 'Bezahlen');

    this.data.openOrders.subscribe(orders => {
      this.orders = orders;

      this.loading.deactivateLoading();
    });
  }


}
