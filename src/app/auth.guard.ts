import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './services/auth.service';

/** Protege las rutas que leen/escriben datos reales: exige sesión + rol admin. */
export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = await firstValueFrom(authService.authState$);
  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  const esAdmin = await authService.checkUserRole(user.uid);
  if (!esAdmin) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};
