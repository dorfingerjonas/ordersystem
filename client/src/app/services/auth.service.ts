import { computed, Injectable, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../supabase/supabase';
import { nameFromEmail } from '../utils/format';

@Injectable({ providedIn: 'root' })
export class AuthService {

  public readonly session = signal<Session | null>(null);
  public readonly isLoggedIn = computed(() => !!this.session());
  public readonly isAdmin = computed(() => this.session()?.user.app_metadata?.['role'] === 'admin');
  public readonly userId = computed(() => this.session()?.user.id ?? '');
  public readonly email = computed(() => this.session()?.user.email ?? '');

  public readonly username = computed(() => nameFromEmail(this.email()));

  public readonly firstName = computed(() => this.username().split(' ')[0] ?? '');

  /** resolves once the initial session was restored from storage */
  public readonly ready: Promise<void>;

  constructor() {
    this.ready = supabase.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
    });
  }

  public async signIn(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

    if (error) {
      throw error;
    }
  }

  public async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }
}
