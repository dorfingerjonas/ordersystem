import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ready;

  if (auth.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree([ '/login' ], { queryParams: { redirectUrl: state.url } });
};

export const loginGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ready;

  return auth.isLoggedIn() ? router.createUrlTree([ '/tables' ]) : true;
};

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ready;

  return auth.isAdmin() ? true : router.createUrlTree([ '/more' ]);
};
