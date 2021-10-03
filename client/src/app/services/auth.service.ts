import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import firebase from 'firebase';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly loggedInState: Subject<boolean>;
  private loggedIn: boolean;
  private email: string;

  constructor(private auth: AngularFireAuth) {
    this.loggedInState = new Subject<boolean>();
    this.loggedIn = false;
    this.email = '';

    this.auth.user.subscribe(user => {
      this.loggedIn = !!user;
      this.loggedInState.next(this.loggedIn);
      this.email = user?.email || '';
    });
  }

  get isLoggedInState(): Observable<boolean> {
    return this.loggedInState;
  }

  get isLoggedIn(): boolean {
    return this.loggedIn;
  }

  get username(): string {
    const username = this.email.replace('@dorfingerjonas.at', '');
    return username.charAt(0).toUpperCase() + username.substring(1, username.length);
  }

  signOut(): ReturnType<firebase.auth.Auth['signOut']> {
    return this.auth.signOut();
  }

  signInWithEmailAndPassword(email: string, password: string): ReturnType<firebase.auth.Auth['signInWithEmailAndPassword']> {
    return new Promise((resolve, reject) => {
      this.auth.signInWithEmailAndPassword(email, password).catch(err => {
        reject(this.getCustomizedErrorMessage(err));
      });
    });
  }

  protected getCustomizedErrorMessage(err: Error): Error {
    const messages: { message: string; feedback: string }[] = [
      {
        message: 'The password is invalid or the user does not have a password.',
        feedback: 'Ungültiges Passwort oder E-Mail.'
      },
      {
        message: 'Too many unsuccessful login attempts.  Please include reCaptcha verification or try again later',
        feedback: 'Der Anmelde Vorgang ist zu oft fehlgeschlagen, versuchen Sie es später erneut.'
      },
      {
        message: 'Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.',
        feedback: 'Der Anmelde Vorgang ist zu oft fehlgeschlagen, versuchen Sie es später erneut.'
      },
      {
        message: 'There is no user record corresponding to this identifier. The user may have been deleted.',
        feedback: 'Es wurde kein Account mit der E-Mail Adresse gefunden.'
      },
      {
        message: 'A network error (such as timeout, interrupted connection or unreachable host) has occurred.',
        feedback: 'Zeitüberschreitung. Versuchen Sie es später erneut.'
      },
      {
        message: 'The email address is already in use by another account.',
        feedback: 'Die angebene E-Mail Adresse wird bereits verwendet.'
      }
    ];

    for (const message of messages) {
      if (err.message === message.message) {
        err.message = message.feedback;
      }
    }

    return err;
  }
}
