import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { LoginService } from './login.service';

/** Requires a live session; remembers the attempted URL for post-login redirect. */
export const authGuard: CanActivateFn = (_route, state) => {
  const loginService = inject(LoginService);
  const router = inject(Router);

  if (loginService.getAuthStatus()) return true;

  loginService.redirectUrl = state.url;
  return router.createUrlTree(['/']);
};

/**
 * Requires an admin account.
 *
 * The previous guard tested `getMemberStatus` — a method reference, so always
 * truthy — and then returned an observable that never completed, so the router
 * hung rather than denying access.
 */
export const adminGuard: CanActivateFn = () => {
  const loginService = inject(LoginService);
  const router = inject(Router);

  if (!loginService.getAuthStatus()) return router.createUrlTree(['/']);

  return loginService.isAdmin().pipe(
    map((isAdmin) => isAdmin || router.createUrlTree(['/projects']))
  );
};
