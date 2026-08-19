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

  // Amenidades cortas, mismo esquema del sitio real (valores 'Sí'/'No'):
  ASC?: string; // Ascensor
  BDG?: string; // Bodega
  GRJ?: string; // Garaje
  LVD?: string; // Lavandería
  Piso?: string;
  Frente?: string;
  Fondo?: string;
  Edificabilidad?: string;

  // Campos "Formato Facebook" que ya existían en el modelo real, ahora sí usados:
  TipoTransaccion?: string;
  GarantiaAliquot?: string;
  BanosCompletos?: string;
  BanosSociales?: string;
  CaracteristicasInternas?: string[];
  SeguridadAreasLibres?: string[];
  AreaTotalTerreno?: string;
  PrecioPorM2?: string;
  Topografia?: string;
  EstadoDocumentos?: string;
  ServiciosBasicos?: string[];
  UsoSuelo?: string;
  ServiciosRiego?: boolean;
  DistanciaCiudad?: string;
  LinkVideoRedes?: string;

  // Campos nuevos para el flujo de captación + aprobación (no existen en registros viejos):
  agenciaId?: string;
  capturadoPor?: string;
  /** 'campo': agente salió a recorrer (foto de letrero + GPS). 'compartida': otra
   *  inmobiliaria o cliente aliado envió fotos + descripción de una propiedad ya lista. */
  origenCaptacion?: 'campo' | 'compartida';
  /** Solo cuando origenCaptacion === 'compartida': quién la compartió. */
  compartidaPor?: string;
  /** Respaldo textual con TODOS los detalles específicos del tipo (IPRUS, checkboxes,
   *  etc.), por si algo no tiene campo dedicado en el esquema real — nada se pierde. */
  detalleCaptacion?: Record<string, unknown>;
}
