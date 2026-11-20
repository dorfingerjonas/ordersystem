import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../services/auth.service';
import { NotifyService } from '../../services/notify.service';

@Component({
  selector: 'app-login',
  imports: [ FormsModule, InputTextModule, PasswordModule, ButtonModule, MessageModule ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="screen">
      <main class="page-main login">
        <div class="brand">
          <img src="assets/images/ordersystem-clipped.svg" alt="" aria-hidden="true">
          <h1>Ordersystem</h1>
          <p>Melde dich an, um Bestellungen aufzunehmen.</p>
        </div>

        <form class="card form" (ngSubmit)="login()" #f="ngForm">
          <div class="field">
            <label for="email">E-Mail</label>
            <input pInputText id="email" name="email" type="email" autocomplete="username" inputmode="email"
                   [(ngModel)]="email" required [disabled]="busy()">
          </div>

          <div class="field">
            <label for="password">Passwort</label>
            <p-password inputId="password" name="password" [(ngModel)]="password" [feedback]="false"
                        [toggleMask]="true" autocomplete="current-password" required [disabled]="busy()" />
          </div>

          @if (error()) {
            <p-message severity="error" icon="pi pi-times-circle">{{ error() }}</p-message>
          }

          <button type="submit" class="cta dark" [disabled]="busy() || !email || !password">
            @if (busy()) {
              <i class="pi pi-spin pi-spinner" aria-hidden="true"></i> Anmelden …
            } @else {
              <i class="pi pi-sign-in" aria-hidden="true"></i> Anmelden
            }
          </button>
        </form>
      </main>
    </div>
  `,
  styles: `
    .login { justify-content: center; padding-bottom: 48px; }
    .brand { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; margin-bottom: 8px; }
    .brand img { height: 44px; width: auto; }
    .brand h1 { font-size: 30px; font-weight: 800; letter-spacing: -.5px; }
    .brand p { color: var(--os-muted); font-size: 15px; }
    .form { padding: 20px 16px; display: flex; flex-direction: column; gap: 16px; }
  `
})
export class LoginPage {

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotifyService);

  public readonly redirectUrl = input<string>();

  protected email = '';
  protected password = '';
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async login(): Promise<void> {
    if (this.busy()) return;

    this.busy.set(true);
    this.error.set(null);

    try {
      await this.auth.signIn(this.email, this.password);
      this.notify.success(`Hallo ${ this.auth.firstName() }!`, 'Du bist angemeldet.');
      await this.router.navigateByUrl(this.redirectUrl() || '/tables', { replaceUrl: true });
    } catch (e) {
      this.error.set(NotifyService.describe(e) ?? 'Anmeldung fehlgeschlagen.');
    } finally {
      this.busy.set(false);
    }
  }
}
