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
import { Observable, map } from 'rxjs';
import { PropiedadFirestore } from '../models/propiedad-firestore.model';

/**
 * Conexión al catálogo real (`finalinmobiliaria/Propiedades`).
 *
 * - Lectura: propiedades con Estado == 'Borrador' (pantalla /real, solo admin).
 * - Escritura: crear Borradores nuevos (formulario de captación) y, ahora sí,
 *   aprobar/publicar un Borrador existente (reordenar fotos, editar texto, cambiar
 *   Estado a Venta/Renta). Esto último SOLO lo hace un admin desde /real, con
 *   confirmación explícita en la UI antes de escribir.
 *
 * Nota: aprobar y publicar aquí deja la propiedad visible en el sitio y consultable
 * por el bot de WhatsApp de inmediato (ambos leen directo de esta colección). La
 * publicación automática en Facebook (Cloud Function `publicarPropiedad`) es un paso
 * aparte que todavía no existe.
 */
@Injectable({ providedIn: 'root' })
export class FirestorePropiedadesService {
  private readonly firestore = inject(Firestore);
  private readonly storage = inject(Storage);
  private readonly auth = inject(Auth);
  private readonly propiedadesCollection = collection(this.firestore, 'Propiedades');

  borradoresReal$(): Observable<PropiedadFirestore[]> {
    const q = query(this.propiedadesCollection, where('Estado', '==', 'Borrador'));
    return collectionData(q, { idField: 'id' }).pipe(map((docs) => docs as PropiedadFirestore[]));
  }

  porIdReal$(id: string): Observable<PropiedadFirestore> {
    const docRef = doc(this.firestore, 'Propiedades', id);
    return docData(docRef, { idField: 'id' }) as Observable<PropiedadFirestore>;
  }

  /** Genera el siguiente código IPD tipo FX-2026-014, revisando los códigos ya usados. */
  async generarSiguienteIPD(): Promise<string> {
    const anio = new Date().getFullYear();
    const prefijo = `FX-${anio}-`;
    try {
      const snapshot = await getDocs(this.propiedadesCollection);
      let maxNumero = 0;
      snapshot.forEach((docSnap) => {
        const ipd = (docSnap.data() as PropiedadFirestore).IPD || '';
        if (ipd.startsWith(prefijo)) {
          const numero = parseInt(ipd.slice(prefijo.length), 10);
          if (!isNaN(numero) && numero > maxNumero) maxNumero = numero;
        }
      });
      return `${prefijo}${String(maxNumero + 1).padStart(3, '0')}`;
    } catch (e) {
      console.error('No se pudo calcular el siguiente código IPD, usando respaldo por fecha:', e);
      return `${prefijo}${Date.now().toString().slice(-6)}`;
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
   */
  async crearBorrador(datos: Omit<PropiedadFirestore, 'id' | 'imagenes'>, fotos: File[]): Promise<string> {
    const ipd = datos.IPD;
    const imagenes: string[] = [];
    for (let i = 0; i < fotos.length; i++) {
      imagenes.push(await this.subirFoto(ipd, fotos[i], i));
    }

    const payload: Record<string, unknown> = {
      ...datos,
      agenciaId: 'fenix-ec',
      Estado: 'Borrador',
      imagenes,
      ImagenFolder: `imagenes_propiedades/${ipd}`,
      capturadoPor: this.auth.currentUser?.email ?? 'Desconocido',
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

  /**
   * Aprueba y publica: pasa de Borrador a Venta/Renta (según qué campo de precio
   * tenga la propiedad). A partir de aquí es visible en el sitio público y el bot
   * de WhatsApp la puede recomendar de inmediato.
   */
  async aprobarYPublicar(propiedad: PropiedadFirestore): Promise<void> {
    const docRef = doc(this.firestore, 'Propiedades', propiedad.id!);
    const nuevoEstado = propiedad.Precio_Venta ? 'Venta' : 'Renta';
    await updateDoc(docRef, {
      imagenes: propiedad.imagenes ?? [],
      Extras: propiedad.Extras ?? '',
      Estado: nuevoEstado,
    });
  }
}
