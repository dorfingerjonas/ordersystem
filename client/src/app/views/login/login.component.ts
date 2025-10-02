import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: [ './login.component.scss' ]
})
export class LoginComponent implements OnInit {

  formGroup: FormGroup;
  responseError: string | undefined;

  constructor(private auth: AuthService,
              private loading: LoadingService) {
    this.formGroup = new FormGroup({
      email: new FormControl('', [
        Validators.required
      ]),
      password: new FormControl('', [
        Validators.required
      ])
    });
  }

  public ngOnInit(): void {
    this.loading.deactivateLoading();
  }

  public login(): void {
    if (this.formGroup.valid) {
      this.loading.activateLoading();

      const { email, password } = this.formGroup.value;

      this.auth.signInWithEmailAndPassword(email, password)
        .catch(err => {
          this.loading.deactivateLoading();
          this.responseError = err.message;
        });
    }
  }
}
