import { Component } from '@angular/core';
import { DataService } from '../../services/data.service';
import { HeaderService } from '../../services/header.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: [ './dashboard.component.scss' ]
})
export class DashboardComponent {

  public revenuePaid: number;
  public revenueUnPaid: number;
  public revenue: number;

  constructor(private readonly data: DataService,
              private readonly header: HeaderService) {
    this.header.text = 'Dashboard';

    this.revenuePaid = 0;
    this.revenueUnPaid = 0;
    this.revenue = 0;

    this.data.fetchData();

    this.data.orderedItems.subscribe(items => {
      this.revenuePaid = 0;
      this.revenueUnPaid = 0;

      if (!items || items.length === 0) return;

      for (const item of items) {
        if (item.paid) {
          this.revenuePaid += item.item.price;
        } else {
          this.revenueUnPaid += item.item.price;
        }
      }

      this.revenue = this.revenuePaid + this.revenueUnPaid;
    });
  }

}
