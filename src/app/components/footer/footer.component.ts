import { Component, OnInit } from '@angular/core';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faSignOutAlt, faCashRegister } from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: [ './footer.component.scss' ]
})
export class FooterComponent implements OnInit {

  faSignOutAlt = faSignOutAlt;

  icons: { url: string, icon: IconProp }[] = [
    {
      url: '/pay',
      icon: faCashRegister
    }
  ];

  constructor(private auth: AuthService) {
  }

  ngOnInit(): void {
  }

  signOut(): void {
    this.auth.signOut();
  }
}
