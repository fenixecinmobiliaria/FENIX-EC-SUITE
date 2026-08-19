import { TipoPropiedadKey } from './detalle-tipo-propiedad';

export type EstadoProspecto = 'Por llamar' | 'No contesta' | 'Va a consultar' | 'Rechazó' | 'Aceptó';

export interface IntentoContacto {
  fecha: number; // Date.now() — más simple de ordenar/mostrar en el cliente que Timestamp
  estado: EstadoProspecto;
  nota?: string;
}

/**
 * Un "prospecto" es un letrero visto en la calle, ANTES de que el dueño acepte pagar
 * comisión. Vive separado de `Propiedades` a propósito — no es una propiedad real
 * todavía, es un contacto en proceso. Solo cuando el dueño confirma que quiere el
 * servicio (botón "Aceptó") se abre la pantalla de captación completa
 * (/captura-completar?prospectoId=...) y este documento se elimina al guardar.
 */
export interface Prospecto {
  id?: string;
  fotoLetrero: string;
  linkMapa?: string;
  CIUDAD?: string;
  Direccion_Sector?: string; // sector de referencia
  tipo?: TipoPropiedadKey;
  Modalidad?: 'Venta' | 'Renta';
  capturadoPor: string; // iniciales del captador
  capturadoPorUid: string;
  estado: EstadoProspecto;
  intentos: IntentoContacto[];
  fechaCreacion: number;
}
