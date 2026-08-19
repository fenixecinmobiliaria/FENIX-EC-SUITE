import { Injectable, signal } from '@angular/core';
import { Propiedad } from '../models/propiedad.model';
import { MOCK_PROPIEDADES } from '../data/mock-propiedades';

/**
 * Servicio en memoria (mock) que simula el repositorio de Propiedades.
 *
 * Cuando se conecte a Firebase real, este servicio se reemplaza por uno que hable con
 * Firestore (`finalinmobiliaria/Propiedades`), pero la interfaz pública (signals +
 * métodos) se mantiene igual para no tener que tocar los componentes.
 */
@Injectable({ providedIn: 'root' })
export class PropiedadesService {
  private readonly _propiedades = signal<Propiedad[]>(structuredClone(MOCK_PROPIEDADES));

  readonly propiedades = this._propiedades.asReadonly();

  borradores() {
    return this._propiedades().filter((p) => p.Estado === 'Borrador');
  }

  publicadas() {
    return this._propiedades().filter((p) => p.Estado !== 'Borrador');
  }

  porId(id: string): Propiedad | undefined {
    return this._propiedades().find((p) => p.id === id);
  }

  actualizarOrdenFotos(id: string, imagenes: string[]) {
    this._propiedades.update((lista) =>
      lista.map((p) => (p.id === id ? { ...p, imagenes } : p)),
    );
  }

  actualizarPortada(id: string, fotoPortadaUrl: string) {
    this._propiedades.update((lista) =>
      lista.map((p) => (p.id === id ? { ...p, fotoPortadaUrl } : p)),
    );
  }

  actualizarTexto(id: string, extras: string) {
    this._propiedades.update((lista) =>
      lista.map((p) => (p.id === id ? { ...p, Extras: extras } : p)),
    );
  }

  /**
   * Aprueba y "publica" la propiedad: pasa de Borrador a Venta/Renta.
   * En la versión real esto dispara la Cloud Function `publicarPropiedad`
   * (Firestore Estado → Venta/Renta + publicación en Facebook vía Graph API).
   */
  aprobarYPublicar(id: string) {
    this._propiedades.update((lista) =>
      lista.map((p) => {
        if (p.id !== id) return p;
        const nuevoEstado = p.Precio_Venta ? 'Venta' : 'Renta';
        return { ...p, Estado: nuevoEstado as Propiedad['Estado'] };
      }),
    );
  }
}
