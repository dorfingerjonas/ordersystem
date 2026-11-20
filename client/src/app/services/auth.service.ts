import { computed, Injectable, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../supabase/supabase';

@Injectable({ providedIn: 'root' })
export class AuthService {

  public readonly session = signal<Session | null>(null);
  public readonly isLoggedIn = computed(() => !!this.session());
  public readonly isAdmin = computed(() => this.session()?.user.app_metadata?.['role'] === 'admin');
  public readonly email = computed(() => this.session()?.user.email ?? '');

  /** "max-mustermann@x.at" -> "Max Mustermann" */
  public readonly username = computed(() => this.email()
    .split('@')[0]
    .split(/[-._]/)
    .filter(Boolean)
    .map(v => v.substring(0, 1).toUpperCase() + v.substring(1).toLowerCase())
    .join(' '));

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
