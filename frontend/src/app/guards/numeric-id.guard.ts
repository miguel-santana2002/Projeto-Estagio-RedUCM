import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const numericIdGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const id = route.paramMap.get('id');

  if (!id || isNaN(Number(id))) {
    router.navigate(['/page-not-found'], { skipLocationChange: true });
    return false;
  }

  return true;
};
