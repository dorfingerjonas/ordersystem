import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { ActivatedRoute, Router, UrlTree } from '@angular/router';
import { AuthService } from './services/auth.service';
import { LoadingService } from './services/loading.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: [ './app.component.scss' ]
})
export class AppComponent implements OnInit {

  title = 'ordersystem';
  loadingState: Observable<boolean>;
  isLoggedIn: Observable<boolean>;

  constructor(private router: Router,
              private route: ActivatedRoute,
              private auth: AuthService,
              private loading: LoadingService) {
    this.loadingState = loading.loadingState;
    this.isLoggedIn = auth.isLoggedInState;
  }

  public ngOnInit(): void {
    this.auth.isLoggedInState.subscribe(state => {
      let redirectUrl: string | UrlTree = '/tables';

      if (state) {
        this.route.queryParams.subscribe(value => {
          if (value['redirectUrl']) {
            redirectUrl = value['redirectUrl'];
          }
        });
      } else {
        this.route.queryParams.subscribe(value => {
          if (value['redirectUrl']) {
            redirectUrl = this.router.createUrlTree(
              [ '/login' ], {
                queryParams: {
                  redirectUrl: value['redirectUrl']
                }
              }
            );
          } else {
            redirectUrl = '/login';
          }
        });
      }

      this.router.navigateByUrl(redirectUrl, { replaceUrl: true, skipLocationChange: false })
        .then(() => this.loading.deactivateLoading())
        .catch(err => {
          console.error(err);
        });
    });
  }
}
