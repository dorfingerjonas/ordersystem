import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const redirectUrl = route.url;

  if (!auth.isLoggedIn) {
    router.navigateByUrl(
      router.createUrlTree(
        [ '/login' ], {
          queryParams: {
            redirectUrl
          }
        }
      )
    );

    return false;
  }

  return true;
};
