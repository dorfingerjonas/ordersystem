import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { AuthError } from '@supabase/supabase-js';
import { supabase } from '../supabase/supabase';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly loggedInState: Subject<boolean>;
  private loggedIn: boolean;
  private email: string;

  constructor() {
    this.loggedInState = new Subject<boolean>();
    this.loggedIn = false;
    this.email = '';

    supabase.auth.onAuthStateChange((event, session) => {
      this.loggedIn = !!session;
      this.loggedInState.next(this.loggedIn);
      this.email = session?.user.email || '';
    });
  }

  get isLoggedInState(): Observable<boolean> {
    return this.loggedInState;
  }

  get isLoggedIn(): boolean {
    return this.loggedIn;
  }

  get username(): string {
    return this.email
      .split('@')[0]
      .split('-')
      .map(v => v.substring(0, 1).toUpperCase() + v.substring(1, v.length).toLowerCase())
      .join(' ');
  }

  public signOut(): Promise<{ error: AuthError | null }> {
    return supabase.auth.signOut();
  }

  public signInWithEmailAndPassword(email: string, password: string): Promise<void> {
    return new Promise((resolve, reject) => {
      supabase.auth.signInWithPassword({ email, password }).then(res => {
        if (res.data) {
          resolve();
        }
      }).catch(err => {
        reject(err);
      });
    });
  }
}
