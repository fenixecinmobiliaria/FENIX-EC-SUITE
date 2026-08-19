import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';

export interface Captador {
  uid: string;
  iniciales: string;
  email: string;
  rol: 'captador';
}

/**
 * Gestión de cuentas de captador (crear/editar/eliminar) — todo vía Cloud Functions
 * con Admin SDK, nunca desde el navegador directo, por dos razones:
 *  1. El SDK cliente de Firebase Auth no deja crear otro usuario sin cerrar la sesión
 *     del admin que está logueado (te saca de tu propia cuenta).
 *  2. Mantiene todo bajo el mismo chequeo de rol admin del servidor, sin depender de
 *     reglas de seguridad de Firestore que no están documentadas en este repo.
 */
@Injectable({ providedIn: 'root' })
export class CaptadoresService {
  private readonly functions = inject(Functions);

  async listar(): Promise<Captador[]> {
    const llamar = httpsCallable<void, Captador[]>(this.functions, 'listarCaptadores');
    const respuesta = await llamar();
    return respuesta.data;
  }

  async crear(iniciales: string, password: string): Promise<Captador> {
    const llamar = httpsCallable<{ iniciales: string; password: string }, Captador>(
      this.functions,
      'crearCaptador',
    );
    const respuesta = await llamar({ iniciales, password });
    return respuesta.data;
  }

  async actualizarIniciales(uid: string, iniciales: string): Promise<void> {
    const llamar = httpsCallable<{ uid: string; iniciales: string }, { ok: boolean }>(
      this.functions,
      'actualizarInicialesCaptador',
    );
    await llamar({ uid, iniciales });
  }

  async eliminar(uid: string): Promise<void> {
    const llamar = httpsCallable<{ uid: string }, { ok: boolean }>(this.functions, 'eliminarCaptador');
    await llamar({ uid });
  }
}
