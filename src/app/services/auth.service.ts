import { Injectable, inject } from '@angular/core';
import { Auth, authState, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { User } from 'firebase/auth';

/**
 * Mismo patrón de autenticación que `inmobiliaria_fenix/src/app/services/auth.service.ts`:
 * login con email/password de Firebase Auth + verificación de rol admin en Firestore
 * (`User/{uid}.rol === 'admin'`). Se reutiliza intencionalmente el mismo esquema de
 * usuarios/roles para que un agente que ya tiene cuenta en el panel admin del sitio
 * pueda usar las mismas credenciales aquí.
 */
export interface Credential {
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  readonly authState$: Observable<User | null> = authState(this.auth);

  /** Inicia sesión y devuelve el rol asignado en `User/{uid}.rol` (o null si no tiene). */
  async logInWithEmailAndPassword(credential: Credential): Promise<string | null> {
    const userCredential = await signInWithEmailAndPassword(this.auth, credential.email, credential.password);
    return this.obtenerRol(userCredential.user.uid);
  }

  async obtenerRol(userId: string): Promise<string | null> {
    try {
      const userRef = doc(this.firestore, 'User', userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        return userDoc.data()?.['rol'] ?? null;
      }
      return null;
    } catch (e) {
      console.error('Error al leer el rol de usuario:', e);
      return null;
    }
  }

  async checkUserRole(userId: string): Promise<boolean> {
    return (await this.obtenerRol(userId)) === 'admin';
  }

  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  logOut() {
    return signOut(this.auth);
  }
}
