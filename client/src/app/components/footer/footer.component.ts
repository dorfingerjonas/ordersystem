import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: [ './footer.component.scss' ]
})
export class FooterComponent {

  icons: { url: string, icon: string }[] = [
    {
      url: 'tables',
      icon: 'table_restaurant'
    },
    {
      url: 'pay',
      icon: 'local_atm'
    }
  ];

  constructor(private auth: AuthService) {
  }

  signOut(): void {
    this.auth.signOut();
  }
}
