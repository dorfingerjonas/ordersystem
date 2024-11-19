import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: [ './menu.component.scss' ]
})
export class MenuComponent {

  public username: string;

  constructor(private readonly auth: AuthService,
              private bottomSheetRef: MatBottomSheetRef<MenuComponent>) {
    this.username = this.auth.username;
  }

  public logout(): void {
    this.auth.signOut();

    this.close();
  }

  public close(): void {
    this.bottomSheetRef.dismiss();
  }
}
