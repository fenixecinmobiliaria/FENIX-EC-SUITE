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

  async logInWithEmailAndPassword(credential: Credential): Promise<boolean> {
    const userCredential = await signInWithEmailAndPassword(this.auth, credential.email, credential.password);
    return this.checkUserRole(userCredential.user.uid);
  }

  async checkUserRole(userId: string): Promise<boolean> {
    try {
      const userRef = doc(this.firestore, 'User', userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        return data?.['rol'] === 'admin';
      }
      return false;
    } catch (e) {
      console.error('Error al verificar rol de usuario:', e);
      return false;
    }
  }

  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  logOut() {
    return signOut(this.auth);
  }
}
