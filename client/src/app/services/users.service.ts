import { Injectable, signal } from '@angular/core';
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import { supabase } from '../supabase/supabase';

export interface AppUser {
  id: string;
  email: string;
  admin: boolean;
  banned: boolean;
  createdAt: string;
  lastSignInAt: string | null;
}

/**
 * Account management for admins. Talks to the `admin-users` Edge Function,
 * which holds the service_role key and re-checks the admin role server side.
 */
@Injectable({ providedIn: 'root' })
export class UsersService {

  public readonly users = signal<AppUser[]>([]);
  public readonly loaded = signal(false);

  public async load(): Promise<void> {
    this.users.set(await this.call<AppUser[]>({ action: 'list' }));
    this.loaded.set(true);
  }

  public async create(email: string, password: string, admin: boolean): Promise<AppUser> {
    const user = await this.call<AppUser>({ action: 'create', email, password, admin });
    this.users.update(list => [ ...list, user ].sort((a, b) => a.email.localeCompare(b.email)));
    return user;
  }

  public async setAdmin(id: string, admin: boolean): Promise<void> {
    this.replace(await this.call<AppUser>({ action: 'setRole', id, admin }));
  }

  public async setPassword(id: string, password: string): Promise<void> {
    await this.call<AppUser>({ action: 'setPassword', id, password });
  }

  public async setBanned(id: string, banned: boolean): Promise<void> {
    this.replace(await this.call<AppUser>({ action: banned ? 'ban' : 'unban', id }));
  }

  public async remove(id: string): Promise<void> {
    await this.call({ action: 'delete', id });
    this.users.update(list => list.filter(u => u.id !== id));
  }

  private replace(user: AppUser): void {
    this.users.update(list => list.map(u => u.id === user.id ? user : u));
  }

  private async call<T>(body: Record<string, unknown>): Promise<T> {
    const { data, error } = await supabase.functions.invoke('admin-users', { body });

    if (error) {
      // surface the German message the function sends instead of "non-2xx status code"
      if (error instanceof FunctionsHttpError) {
        const payload = await error.context.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? error.message);
      }
      if ((error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) && navigator.onLine) {
        throw new Error('Benutzerverwaltung nicht erreichbar. Ist die Edge Function „admin-users“ deployt?');
      }
      throw error;
    }

    return data as T;
  }
}
