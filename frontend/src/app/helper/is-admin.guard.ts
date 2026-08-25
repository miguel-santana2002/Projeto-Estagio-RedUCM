import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, tap } from 'rxjs/operators';

export const isAdminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.loggedInInfo().pipe(
    map((data: any) => {
      if (data.companies === null || data.companies.length === 0) {
        return true; // Permite acesso
      } else {
        router.navigate(['/home']); // Redireciona para '/home' se não for admin
        return false; // Bloqueia acesso
      }
    })
  );
}