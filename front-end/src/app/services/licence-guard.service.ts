import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { LicenceService } from './licence.service';

/**
 * Sends the user to the licence screen when the platform is unlicensed.
 *
 * Authority rests with the server, which refuses every business endpoint with
 * 402 until a signed licence is installed. This guard only spares the user a
 * screen full of failed requests — it is not the enforcement point, so there is
 * nothing to gain by editing it in the browser.
 */
export const licenceGuard: CanActivateFn = () => {
  const licence = inject(LicenceService);
  const router = inject(Router);

  const decide = (valid: boolean) => valid || router.createUrlTree(['/licence']);

  // Use the cached value when we already have one; only ask on a cold start.
  if (licence.status.installed || licence.status.valid) {
    return decide(licence.status.valid);
  }

  return licence.refresh().pipe(map((status) => decide(status.valid)));
};
