import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs/operators';

export const isAdminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.loggedInInfo().pipe(
    map((data: any) => {
      const hasAdminRole = Boolean(
        data && (data.is_admin || data.is_superuser),
      );

      if (hasAdminRole) {
        return true;
      }

      router.navigate(['/home']);
      return false;
    }),
  );
};
