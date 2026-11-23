import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { AutoFocusModule } from 'primeng/autofocus';
import { ConfirmationService } from 'primeng/api';
import { AppUser, UsersService } from '../../../services/users.service';
import { AuthService } from '../../../services/auth.service';
import { NotifyService } from '../../../services/notify.service';
import { nameFromEmail } from '../../../utils/format';

const MIN_PASSWORD_LENGTH = 6;

@Component({
  selector: 'app-users',
  imports: [ DatePipe, FormsModule, RouterLink, DialogModule, ButtonModule, InputTextModule, ToggleSwitchModule, AutoFocusModule ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users.page.html',
  styles: `
    :host { display: contents; --os-page-max: 760px; }
    .user-row { width: 100%; border: none; background: var(--os-card); text-align: left; color: var(--os-text); cursor: pointer; font: inherit; }
    .user-row:active { background: var(--os-card-soft); }
    .user-row.banned .row-title, .user-row.banned .row-sub { opacity: .55; }
    .avatar {
      width: 40px; height: 40px; flex-shrink: 0; border-radius: 50%;
      background: var(--os-primary-soft); color: var(--os-on-primary-soft);
      display: flex; align-items: center; justify-content: center; font-weight: 800;
    }
    .badges { display: flex; gap: 6px; flex-wrap: wrap; flex-shrink: 0; justify-content: flex-end; }
    .badge {
      font-size: 12px; font-weight: 700; padding: 3px 8px; border-radius: 999px;
      background: var(--os-card-soft); color: var(--os-text-2); border: 1px solid var(--os-border);
    }
    .badge.admin { background: var(--os-primary-soft); color: var(--os-on-primary-soft); border-color: transparent; }
    .badge.banned { background: var(--os-danger-soft); color: var(--os-on-danger-soft); border-color: transparent; }
    .chev { color: var(--os-faint); }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; }
    .toggle-row { display: flex; align-items: center; gap: 12px; }
    .pw { display: flex; gap: 8px; }
    .pw input { flex: 1 1 auto; min-width: 0; }
    .pw .btn-ghost { flex-shrink: 0; width: 44px; padding: 0; }
    .hint { font-size: 13px; color: var(--os-muted); }
    .warn { color: var(--os-danger); font-size: 13px; font-weight: 600; }
    .actions { display: flex; flex-direction: column; gap: 8px; }
    .divider { height: 1px; background: var(--os-divider); margin: 0; border: none; }
    @media (min-width: 768px) {
      .user-row { transition: background .12s ease; }
      .user-row:hover { background: var(--os-card-soft); }
    }
  `
})
export class UsersPage implements OnInit {

  protected readonly users = inject(UsersService);
  protected readonly auth = inject(AuthService);
  private readonly notify = inject(NotifyService);
  private readonly confirm = inject(ConfirmationService);

  protected readonly minLength = MIN_PASSWORD_LENGTH;
  protected readonly name = nameFromEmail;

  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly search = signal('');

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const list = this.users.users();
    return q ? list.filter(u => u.email.toLowerCase().includes(q) || nameFromEmail(u.email).toLowerCase().includes(q)) : list;
  });

  protected readonly adminCount = computed(() => this.users.users().filter(u => u.admin).length);

  // ----- create dialog -----
  protected readonly createDialog = signal(false);
  protected readonly newEmail = signal('');
  protected readonly newPassword = signal('');
  protected readonly newAdmin = signal(false);
  protected readonly showNewPassword = signal(true);

  protected readonly newEmailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.newEmail().trim()));
  protected readonly duplicateEmail = computed(() => {
    const email = this.newEmail().trim().toLowerCase();
    return !!email && this.users.users().some(u => u.email.toLowerCase() === email);
  });
  protected readonly canCreate = computed(() =>
    this.newEmailValid() && !this.duplicateEmail() && this.newPassword().length >= MIN_PASSWORD_LENGTH);

  // ----- edit dialog -----
  protected readonly editDialog = signal(false);
  protected readonly editing = signal<AppUser | null>(null);
  protected readonly editPassword = signal('');
  protected readonly showEditPassword = signal(true);
  protected readonly isSelf = computed(() => this.editing()?.id === this.auth.userId());

  public ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);

    try {
      await this.users.load();
    } catch (e) {
      this.loadError.set(NotifyService.describe(e) ?? 'Unbekannter Fehler.');
    } finally {
      this.loading.set(false);
    }
  }

  protected initial(user: AppUser): string {
    return (nameFromEmail(user.email) || user.email).substring(0, 1).toUpperCase();
  }

  /** readable, no ambiguous characters (0/O, 1/l/I) */
  protected generatePassword(): string {
    const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = crypto.getRandomValues(new Uint32Array(10));
    return Array.from(bytes, b => chars[b % chars.length]).join('');
  }

  // ---------- create ----------

  protected openCreate(): void {
    this.newEmail.set('');
    this.newPassword.set(this.generatePassword());
    this.newAdmin.set(false);
    this.showNewPassword.set(true);
    this.createDialog.set(true);
  }

  protected async create(): Promise<void> {
    if (!this.canCreate() || this.saving()) return;

    this.saving.set(true);

    try {
      const user = await this.users.create(this.newEmail().trim(), this.newPassword(), this.newAdmin());
      this.createDialog.set(false);
      this.notify.success(`${ nameFromEmail(user.email) } angelegt`, 'Passwort jetzt weitergeben – es wird nicht mehr angezeigt.', 5000);
    } catch (e) {
      this.notify.error('Konto konnte nicht angelegt werden', e);
    } finally {
      this.saving.set(false);
    }
  }

  // ---------- edit ----------

  protected openEdit(user: AppUser): void {
    this.editing.set(user);
    this.editPassword.set('');
    this.showEditPassword.set(true);
    this.editDialog.set(true);
  }

  protected async toggleAdmin(admin: boolean): Promise<void> {
    const user = this.editing();
    if (!user || this.isSelf() || this.saving()) return;

    this.saving.set(true);

    try {
      await this.users.setAdmin(user.id, admin);
      this.editing.set({ ...user, admin });
      this.notify.success(admin ? `${ nameFromEmail(user.email) } ist jetzt Admin` : `${ nameFromEmail(user.email) } ist kein Admin mehr`,
        'Wirkt spätestens nach der nächsten Token-Erneuerung (max. 1 Stunde).', 4000);
    } catch (e) {
      this.editing.set({ ...user }); // snap the switch back
      this.notify.error('Rolle konnte nicht geändert werden', e);
    } finally {
      this.saving.set(false);
    }
  }

  protected async savePassword(): Promise<void> {
    const user = this.editing();
    const password = this.editPassword();
    if (!user || password.length < MIN_PASSWORD_LENGTH || this.saving()) return;

    this.saving.set(true);

    try {
      await this.users.setPassword(user.id, password);
      this.editPassword.set('');
      this.notify.success('Passwort gesetzt', user.id === this.auth.userId() ? undefined : `Neues Passwort an ${ nameFromEmail(user.email) } weitergeben.`, 4000);
    } catch (e) {
      this.notify.error('Passwort konnte nicht gesetzt werden', e);
    } finally {
      this.saving.set(false);
    }
  }

  protected toggleBan(): void {
    const user = this.editing();
    if (!user || this.isSelf()) return;

    const name = nameFromEmail(user.email);
    const ban = !user.banned;

    const run = async () => {
      this.saving.set(true);
      try {
        await this.users.setBanned(user.id, ban);
        this.editing.set({ ...user, banned: ban });
        this.notify.success(ban ? `${ name } gesperrt` : `${ name } entsperrt`);
      } catch (e) {
        this.notify.error(ban ? 'Konto konnte nicht gesperrt werden' : 'Konto konnte nicht entsperrt werden', e);
      } finally {
        this.saving.set(false);
      }
    };

    if (!ban) {
      void run();
      return;
    }

    this.confirm.confirm({
      header: `${ name } sperren?`,
      message: 'Das Konto kann sich nicht mehr anmelden. Eine laufende Sitzung endet spätestens nach einer Stunde. '
        + 'Bestellungen und Statistik bleiben erhalten, Entsperren ist jederzeit möglich.',
      icon: 'pi pi-ban',
      acceptLabel: 'Sperren',
      rejectLabel: 'Abbrechen',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary' },
      accept: run
    });
  }

  protected remove(): void {
    const user = this.editing();
    if (!user || this.isSelf()) return;

    const name = nameFromEmail(user.email);

    this.confirm.confirm({
      header: `${ name } endgültig löschen?`,
      message: `Das Konto ${ user.email } wird unwiderruflich gelöscht. Bestellungen und Statistik bleiben erhalten. `
        + 'Tipp: „Sperren“ lässt sich rückgängig machen.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Endgültig löschen',
      rejectLabel: 'Abbrechen',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary' },
      accept: async () => {
        try {
          await this.users.remove(user.id);
          this.editDialog.set(false);
          this.notify.success(`${ name } gelöscht`);
        } catch (e) {
          this.notify.error('Konto konnte nicht gelöscht werden', e);
        }
      }
    });
  }
}
