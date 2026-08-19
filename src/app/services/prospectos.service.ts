import { Injectable, inject } from '@angular/core';
import {
  Firestore, addDoc, arrayUnion, collection, collectionData, deleteDoc, doc, getDoc, query, updateDoc, where,
} from '@angular/fire/firestore';
import { Storage, getDownloadURL, ref, uploadBytes } from '@angular/fire/storage';
import { Auth } from '@angular/fire/auth';
import { Observable, map } from 'rxjs';
import { EstadoProspecto, Prospecto } from '../models/prospecto.model';
import { TipoPropiedadKey } from '../models/detalle-tipo-propiedad';

/**
 * "Mis prospectos": letreros vistos en la calle, antes de que el dueño acepte pagar
 * comisión. Colección separada de `Propiedades` (finalinmobiliaria/Prospectos) — no
 * son propiedades reales todavía, así que no aparecen en el catálogo ni en /real.
 */
@Injectable({ providedIn: 'root' })
export class ProspectosService {
  private readonly firestore = inject(Firestore);
  private readonly storage = inject(Storage);
  private readonly auth = inject(Auth);
  private readonly coleccion = collection(this.firestore, 'Prospectos');

  /** Solo los prospectos del captador que tiene la sesión abierta ahora mismo. */
  misProspectos$(): Observable<Prospecto[]> {
    const uid = this.auth.currentUser?.uid;
    const q = query(this.coleccion, where('capturadoPorUid', '==', uid ?? '__ninguno__'));
    return collectionData(q, { idField: 'id' }).pipe(
      map((docs) => (docs as Prospecto[]).sort((a, b) => b.fechaCreacion - a.fechaCreacion)),
    );
  }

  async subirFotoLetrero(file: File): Promise<string> {
    const ruta = `prospectos_letreros/${Date.now()}_${file.name}`;
    const storageRef = ref(this.storage, ruta);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }

  async crear(datos: {
    fotoLetrero: string;
    linkMapa?: string;
    CIUDAD?: string;
    Direccion_Sector?: string;
    tipo?: TipoPropiedadKey;
    Modalidad?: 'Venta' | 'Renta';
    capturadoPor: string;
  }): Promise<string> {
    const payload: Record<string, unknown> = {
      ...datos,
      capturadoPorUid: this.auth.currentUser?.uid ?? '',
      estado: 'Por llamar' as EstadoProspecto,
      intentos: [],
      fechaCreacion: Date.now(),
    };
    for (const key of Object.keys(payload)) {
      if (payload[key] === undefined) delete payload[key];
    }
    const docRef = await addDoc(this.coleccion, payload);
    return docRef.id;
  }

  /** Registra el resultado de una llamada (queda en el historial `intentos`). */
  async registrarIntento(id: string, estado: EstadoProspecto, nota?: string): Promise<void> {
    const docRef = doc(this.firestore, 'Prospectos', id);
    const nuevoIntento = { fecha: Date.now(), estado, nota: nota || null };
    await updateDoc(docRef, { estado, intentos: arrayUnion(nuevoIntento) });
  }

  eliminar(id: string): Promise<void> {
    return deleteDoc(doc(this.firestore, 'Prospectos', id));
  }

  async porId(id: string): Promise<Prospecto | null> {
    const snap = await getDoc(doc(this.firestore, 'Prospectos', id));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Prospecto) : null;
  }
}
