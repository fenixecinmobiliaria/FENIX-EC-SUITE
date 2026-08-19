import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, query, where } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { PropiedadFirestore } from '../models/propiedad-firestore.model';

/**
 * Conexión de SOLO LECTURA al catálogo real (`finalinmobiliaria/Propiedades`).
 *
 * Deliberadamente de solo lectura por ahora: sirve para verificar que la app puede
 * autenticarse y leer el catálogo real antes de habilitar escrituras (reordenar fotos,
 * aprobar y publicar) contra datos de producción. Ese siguiente paso llega junto con
 * el formulario de captación real, para asegurar que el esquema de campos coincide
 * exactamente con lo que espera el sitio público.
 */
@Injectable({ providedIn: 'root' })
export class FirestorePropiedadesService {
  private readonly firestore = inject(Firestore);
  private readonly propiedadesCollection = collection(this.firestore, 'Propiedades');

  borradoresReal$(): Observable<PropiedadFirestore[]> {
    const q = query(this.propiedadesCollection, where('Estado', '==', 'Borrador'));
    return collectionData(q, { idField: 'id' }).pipe(map((docs) => docs as PropiedadFirestore[]));
  }
}
