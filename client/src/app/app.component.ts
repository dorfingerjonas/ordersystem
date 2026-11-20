import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AuthService } from './services/auth.service';
import { UpdateService } from './services/update.service';
import { DataService } from './services/data.service';

@Component({
  selector: 'app-root',
  imports: [ RouterOutlet, ToastModule, ConfirmDialogModule ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet />
    <p-toast position="top-center" [preventOpenDuplicates]="true" />
    <p-confirmdialog [style]="{ width: 'calc(100vw - 32px)', maxWidth: '420px' }" [closable]="false" />
  `
})
export class AppComponent {

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    inject(UpdateService);
    inject(DataService);

    // logged out (also in another tab / token expired) -> back to login
    let wasLoggedIn = false;
    effect(() => {
      const loggedIn = this.auth.isLoggedIn();

      if (wasLoggedIn && !loggedIn) {
        void this.router.navigate([ '/login' ]);
      }

      wasLoggedIn = loggedIn;
    });
  }
}
