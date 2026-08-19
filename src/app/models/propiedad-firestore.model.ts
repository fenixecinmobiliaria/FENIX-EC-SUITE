/**
 * Espejo EXACTO del esquema real en Firestore `finalinmobiliaria/Propiedades`
 * (ver `inmobiliaria_fenix/src/app/models/property.ts`).
 *
 * OJO: en el sitio real casi todos los campos "numéricos" están guardados como string
 * (así los escribió el sitio existente durante años) — el resto del código del sitio
 * (property-card, detalle, etc.) hace comparaciones tipo `AreaCons !== '0'` que asumen
 * string. Hay que respetar estos tipos al ESCRIBIR para no romper el sitio público.
 *
 * Este modelo se usa solo para leer/escribir directamente contra Firestore real.
 * La UI de aprobación sigue trabajando internamente con `Propiedad` (propiedad.model.ts,
 * tipado más cómodo) — `firestore-propiedades.service.ts` hace la conversión entre ambos.
 */
export interface PropiedadFirestore {
  id?: string;
  IPD: string;
  TipoPropiedad: string;
  Estado: string; // 'Borrador' | 'Venta' | 'Arriendo' | 'Arriendo Amoblado' | ...
  CIUDAD: string;
  Direccion_Sector: string;
  Precio_Venta?: string;
  Precio_Renta?: string;
  HAB: string;
  BNO: string;
  AreaCons: string;
  AreaTerreno: string;
  Amoblado: string;
  Extras: string;
  imagenes?: string[];
  ImagenFolder?: string;
  LinkMapa?: string;
  fechaCreacion?: number;
  // Campos nuevos para el flujo de captación + aprobación (no existen en registros viejos):
  agenciaId?: string;
  capturadoPor?: string;
}
