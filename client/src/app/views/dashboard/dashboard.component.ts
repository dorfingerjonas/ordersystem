import { Component } from '@angular/core';
import { DataService } from '../../services/data.service';
import { HeaderService } from '../../services/header.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: [ './dashboard.component.scss' ]
})
export class DashboardComponent {

  constructor(private readonly data: DataService,
              private readonly header: HeaderService) {

    this.header.text = 'Dashboard';

    this.data.fetchData();
  }

}
