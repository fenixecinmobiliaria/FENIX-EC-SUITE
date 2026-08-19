import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  doc,
  docData,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Storage, getDownloadURL, ref, uploadBytes } from '@angular/fire/storage';
import { Auth } from '@angular/fire/auth';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable, map } from 'rxjs';
import { PropiedadFirestore } from '../models/propiedad-firestore.model';

interface ResultadoPublicacion {
  ok: boolean;
  estado: string;
  facebookPostUrl: string | null;
}

/**
 * Conexión al catálogo real (`finalinmobiliaria/Propiedades`).
 *
 * - Lectura: propiedades con Estado == 'Borrador' (pantalla /real, solo admin).
 * - Escritura directa desde el navegador: crear Borradores nuevos (formularios de
 *   captación) y guardar cambios de un Borrador (reordenar fotos, editar texto) SIN
 *   cambiar su Estado.
 * - Aprobar y publicar: NO se hace con un updateDoc directo — se delega a la Cloud
 *   Function `publicarPropiedad`, que corre en el servidor. Así el token de la
 *   Página de Facebook nunca llega al navegador, y la propiedad solo pasa a
 *   Venta/Renta (visible en sitio + bot) si el post de Facebook se publicó con éxito.
 */
@Injectable({ providedIn: 'root' })
export class FirestorePropiedadesService {
  private readonly firestore = inject(Firestore);
  private readonly storage = inject(Storage);
  private readonly auth = inject(Auth);
  private readonly functions = inject(Functions);
  private readonly propiedadesCollection = collection(this.firestore, 'Propiedades');

  borradoresReal$(): Observable<PropiedadFirestore[]> {
    const q = query(this.propiedadesCollection, where('Estado', '==', 'Borrador'));
    return collectionData(q, { idField: 'id' }).pipe(map((docs) => docs as PropiedadFirestore[]));
  }

  porIdReal$(id: string): Observable<PropiedadFirestore> {
    const docRef = doc(this.firestore, 'Propiedades', id);
    return docData(docRef, { idField: 'id' }) as Observable<PropiedadFirestore>;
  }

  /**
   * Genera el siguiente código IPD con la MISMA convención que ya usa el sitio real
   * (`inmobiliaria_fenix/src/app/pages/propiedad/propiedad.component.ts:generarCodigoIPD`):
   * "av" + número incremental (av387, av388, ...) — sin año ni guiones.
   */
  async generarSiguienteIPD(): Promise<string> {
    try {
      const snapshot = await getDocs(this.propiedadesCollection);
      let maxNumero = 0;
      snapshot.forEach((docSnap) => {
        const ipd = (docSnap.data() as PropiedadFirestore).IPD || '';
        if (/^av\d+$/i.test(ipd)) {
          const numero = parseInt(ipd.slice(2), 10);
          if (!isNaN(numero) && numero > maxNumero) maxNumero = numero;
        }
      });
      return `av${maxNumero + 1}`;
    } catch (e) {
      console.error('No se pudo calcular el siguiente código IPD:', e);
      throw e;
    }
  }

  async subirFoto(ipd: string, file: File, indice: number): Promise<string> {
    const ruta = `imagenes_propiedades/${ipd}/${Date.now()}_${indice}_${file.name}`;
    const storageRef = ref(this.storage, ruta);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }

  /**
   * Crea una propiedad nueva en Estado "Borrador" — la deja pendiente de pasar por la
   * pantalla de aprobación antes de ser visible en el sitio, el bot y Facebook.
   *
   * `fotosExistentes` son URLs ya subidas de antes (ej. la foto del letrero de un
   * Prospecto ya aceptado) — van primero en el arreglo, así quedan como portada salvo
   * que el captador agregue y reordene otras.
   */
  async crearBorrador(
    datos: Omit<PropiedadFirestore, 'id' | 'imagenes'>,
    fotos: File[],
    fotosExistentes: string[] = [],
  ): Promise<string> {
    const ipd = datos.IPD;
    const imagenes: string[] = [...fotosExistentes];
    for (let i = 0; i < fotos.length; i++) {
      imagenes.push(await this.subirFoto(ipd, fotos[i], imagenes.length + i));
    }

    const payload: Record<string, unknown> = {
      ...datos,
      agenciaId: 'fenix-ec',
      Estado: 'Borrador',
      imagenes,
      ImagenFolder: `imagenes_propiedades/${ipd}`,
      capturadoPor: datos.capturadoPor || this.auth.currentUser?.email || 'Desconocido',
      fechaCreacion: serverTimestamp(),
    };

    // Firestore no acepta valores `undefined` en un addDoc — se quitan los campos
    // opcionales que no se llenaron (ej. Precio_Renta cuando la modalidad es Venta).
    for (const key of Object.keys(payload)) {
      if (payload[key] === undefined) delete payload[key];
    }

    const docRef = await addDoc(this.propiedadesCollection, payload);
    return docRef.id;
  }

  /** Guarda el nuevo orden de fotos (la portada en el sitio siempre es imagenes[0]). */
  actualizarImagenes(id: string, imagenes: string[]): Promise<void> {
    const docRef = doc(this.firestore, 'Propiedades', id);
    return updateDoc(docRef, { imagenes });
  }

  actualizarTexto(id: string, extras: string): Promise<void> {
    const docRef = doc(this.firestore, 'Propiedades', id);
    return updateDoc(docRef, { Extras: extras });
  }

  /** Llama a la Cloud Function `publicarPropiedad` para el documento ya guardado en Firestore. */
  async publicarPorId(propiedadId: string): Promise<ResultadoPublicacion> {
    const llamar = httpsCallable<{ propiedadId: string }, ResultadoPublicacion>(
      this.functions,
      'publicarPropiedad',
    );
    const respuesta = await llamar({ propiedadId });
    return respuesta.data;
  }

  /**
   * Guarda el orden de fotos + texto definitivos y llama a la Cloud Function
   * `publicarPropiedad`, que publica en la Página de Facebook real y, solo si eso
   * tiene éxito, cambia Estado a Venta/Renta (visible en sitio + bot de inmediato).
   */
  async aprobarYPublicar(propiedad: PropiedadFirestore): Promise<ResultadoPublicacion> {
    const id = propiedad.id!;
    await this.actualizarImagenes(id, propiedad.imagenes ?? []);
    await this.actualizarTexto(id, propiedad.Extras ?? '');
    return this.publicarPorId(id);
  }
}
