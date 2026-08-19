/**
 * Modelo de Propiedad — espejo del esquema real en Firestore `finalinmobiliaria/Propiedades`
 * (ver inmobiliaria_fenix/src/app/models/property.ts para el modelo original).
 *
 * Campos nuevos para el flujo de aprobación:
 * - Estado incluye "Borrador" (propiedad capturada en campo, aún no publicada).
 * - fotoPortadaUrl: cuál de las imágenes del array es la portada elegida por el agente.
 * - agenciaId: preparado para arquitectura multi-cliente (cada inmobiliaria aislada).
 */

export type EstadoPropiedad = 'Borrador' | 'Venta' | 'Renta' | 'Arriendo Amoblado';

export interface Propiedad {
  id: string;
  IPD: string;
  agenciaId: string;
  TipoPropiedad: string;
  Estado: EstadoPropiedad;
  CIUDAD: string;
  Direccion_Sector: string;
  Precio_Venta?: number;
  Precio_Renta?: number;
  HAB: number;
  BNO: number;
  AreaCons: number;
  AreaTerreno: number;
  Amoblado: boolean;
  imagenes: string[];
  fotoPortadaUrl: string;
  Extras: string;
  capturadoPor?: string;
  fechaCaptura?: string;
}
