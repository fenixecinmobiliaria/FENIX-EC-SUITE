import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './services/auth.service';

/**
 * Protege rutas que requieren sesión, sin importar el rol (ej. captación en campo).
 * Cualquier cuenta creada en Firebase Auth de `finalinmobiliaria` con un documento
 * `User/{uid}` (rol admin o captador) puede entrar.
 */
export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = await firstValueFrom(authService.authState$);
  if (!user) {
    router.navigate(['/login']);
    return false;
  }
  return true;
};

/** Protege rutas administrativas (datos reales, aprobación, publicación): exige rol admin. */
export const adminGuard: CanActivateFn = async () => {
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
