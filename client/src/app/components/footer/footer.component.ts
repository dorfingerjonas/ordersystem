import { Component, ChangeDetectionStrategy } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-footer',
    templateUrl: './footer.component.html',
    styleUrls: ['./footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class FooterComponent {

  icons: { url: string, icon: string, displayText: string }[] = [
    {
      url: 'tables',
      icon: 'table_restaurant',
      displayText: 'Tischauswahl'
    },
    {
      url: 'pay',
      icon: 'local_atm',
      displayText: 'Bezahlen'
    }
  ];

  constructor(private auth: AuthService) {
  }

  signOut(): void {
    this.auth.signOut();
  }
}
