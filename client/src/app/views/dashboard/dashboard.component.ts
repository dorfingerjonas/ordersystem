import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DataService } from '../../services/data.service';
import { HeaderService } from '../../services/header.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: [ './dashboard.component.scss' ]
})
export class DashboardComponent {

  public orderCount: number;
  public saleVolume: number;


  constructor(private readonly route: ActivatedRoute,
              private readonly data: DataService,
              private readonly header: HeaderService,
              private readonly snackBar: MatSnackBar,
              private readonly auth: AuthService) {
    this.header.text = 'Dashboard';

    this.data.fetchData();

    this.orderCount = 0;
    this.saleVolume = 0;

    this.data.orders.subscribe(orders => {
      if (!(orders && orders.length > 0)) return;

      this.orderCount = orders.length;

      this.saleVolume = orders.reduce((totalCost, order) => {
        const drinksCost = order.drinks?.reduce((sum, item) => {
          return sum + item.price * (item.amount || 1);
        }, 0) || 0;

        const foodCost = order.food?.reduce((sum, item) => {
          return sum + item.price * (item.amount || 1);
        }, 0) || 0;

        return (totalCost || 0) + drinksCost + foodCost;
      }, 0);
    });
  }

}
