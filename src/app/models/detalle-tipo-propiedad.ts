import { PropiedadFirestore } from './propiedad-firestore.model';

/**
 * Los mismos 7 tipos de propiedad y las mismas preguntas específicas por tipo que ya
 * usa `captacion-app` (src/app/components/captura/captura.component.ts) — para que el
 * formulario de captación de Fenix EC Suite quede estandarizado con el original.
 */
export type TipoPropiedadKey = 'casa' | 'departamento' | 'terreno' | 'local' | 'bodega' | 'edificio' | 'quinta';

export const TIPOS_PROPIEDAD: { key: TipoPropiedadKey; label: string; nombreReal: string }[] = [
  { key: 'casa', label: 'Casa', nombreReal: 'Casa' },
  { key: 'departamento', label: 'Departamento / Suit', nombreReal: 'Departamento' },
  { key: 'terreno', label: 'Terreno / Sitio', nombreReal: 'Terreno' },
  { key: 'local', label: 'Local / Oficina', nombreReal: 'Local Comercial' },
  { key: 'bodega', label: 'Bodega / Galpón', nombreReal: 'Bodega' },
  { key: 'edificio', label: 'Edificio', nombreReal: 'Edificio' },
  { key: 'quinta', label: 'Quinta / Hacienda', nombreReal: 'Quinta' },
];

export interface DetallesCasa {
  habitaciones: number | null;
  banos_completos: number | null;
  medios_banos: number | null;
  pisos: number | null;
  area_terreno_m2: number | null;
  area_construida_m2: number | null;
  alicuota: number | null;
  garaje: boolean;
  bodega: boolean;
  lavanderia: boolean;
  jardin: boolean;
  terraza: boolean;
  piscina: boolean;
  acepta_mascotas: boolean;
  acepta_iva: boolean;
}

export interface DetallesDep {
  habitaciones: number | null;
  banos_completos: number | null;
  medios_banos: number | null;
  piso_edificio: number | null;
  num_departamento: string;
  area_m2: number | null;
  garaje: boolean;
  bodega: boolean;
  lavanderia: boolean;
  terraza_balcon: boolean;
  ascensor: boolean;
  conserje: boolean;
  acepta_mascotas: boolean;
  acepta_iva: boolean;
  alicuota: number | null;
}

export interface DetallesTerreno {
  area_total_m2: number | null;
  frente_ml: number | null;
  fondo_ml: number | null;
  forma: 'Regular' | 'Irregular';
  topografia: string;
  pisos_permitidos_iprus: number | null;
  iprus_actualizado: boolean;
  escritura_titulo: boolean;
  services_basicos: boolean;
  cerramiento: boolean;
  usoSuelo: { Residencial: boolean; Comercial: boolean; Industrial: boolean; Agricola: boolean; Mixto: boolean };
}

export interface DetallesLocal {
  area_m2: number | null;
  piso: string;
  altura_libre_m: number | null;
  frente_vitrina_ml: number | null;
  bano_propio: boolean;
  parqueadero: boolean;
  vitrina_calle: boolean;
  acceso_vehicular: boolean;
  bodega_deposito: boolean;
  cocina_equipada: boolean;
  usoPermitido: { Comercial: boolean; Oficina: boolean; Restaurante: boolean };
}

export interface DetallesBodega {
  area_total_m2: number | null;
  altura_libre_m: number | null;
  area_oficinas_m2: number | null;
  frente_ml: number | null;
  oficinas_incluidas: boolean;
  acceso_vehicular_rampa: boolean;
  puerta_embarque: boolean;
  grua_puente: boolean;
  banos: boolean;
  patio_maniobras: boolean;
  energia_trifasica: boolean;
  tipo_piso: string;
}

export interface DetallesEdificio {
  numero_pisos: number | null;
  numero_deptos: number | null;
  area_terreno_m2: number | null;
  area_construida_total_m2: number | null;
  ascensor: boolean;
  generador: boolean;
  parqueaderos: boolean;
  guardiania: boolean;
  areas_comunales: boolean;
  uso_mixto: boolean;
  estado: string;
}

export interface DetallesQuinta {
  area_total_ha_m2: number | null;
  area_construida_m2: number | null;
  habitaciones: number | null;
  banos: number | null;
  clasificacion: string;
  casa_principal: boolean;
  casas_huespedes: boolean;
  piscina: boolean;
  cancha_deportiva: boolean;
  area_agricola: boolean;
  agua_riego: boolean;
  acceso_pavimentado: boolean;
}

export function detallesCasaVacio(): DetallesCasa {
  return {
    habitaciones: null, banos_completos: null, medios_banos: null, pisos: null,
    area_terreno_m2: null, area_construida_m2: null, alicuota: null,
    garaje: false, bodega: false, lavanderia: false, jardin: false,
    terraza: false, piscina: false, acepta_mascotas: false, acepta_iva: false,
  };
}
export function detallesDepVacio(): DetallesDep {
  return {
    habitaciones: null, banos_completos: null, medios_banos: null, piso_edificio: null,
    num_departamento: '', area_m2: null, garaje: false, bodega: false, lavanderia: false,
    terraza_balcon: false, ascensor: false, conserje: false, acepta_mascotas: false,
    acepta_iva: false, alicuota: null,
  };
}
export function detallesTerrenoVacio(): DetallesTerreno {
  return {
    area_total_m2: null, frente_ml: null, fondo_ml: null, forma: 'Regular', topografia: 'Plano',
    pisos_permitidos_iprus: null, iprus_actualizado: false, escritura_titulo: false,
    services_basicos: false, cerramiento: false,
    usoSuelo: { Residencial: false, Comercial: false, Industrial: false, Agricola: false, Mixto: false },
  };
}
export function detallesLocalVacio(): DetallesLocal {
  return {
    area_m2: null, piso: 'PB', altura_libre_m: null, frente_vitrina_ml: null,
    bano_propio: false, parqueadero: false, vitrina_calle: false, acceso_vehicular: false,
    bodega_deposito: false, cocina_equipada: false,
    usoPermitido: { Comercial: false, Oficina: false, Restaurante: false },
  };
}
export function detallesBodegaVacio(): DetallesBodega {
  return {
    area_total_m2: null, altura_libre_m: null, area_oficinas_m2: null, frente_ml: null,
    oficinas_incluidas: false, acceso_vehicular_rampa: false, puerta_embarque: false,
    grua_puente: false, banos: false, patio_maniobras: false, energia_trifasica: false,
    tipo_piso: 'Hormigon',
  };
}
export function detallesEdificioVacio(): DetallesEdificio {
  return {
    numero_pisos: null, numero_deptos: null, area_terreno_m2: null, area_construida_total_m2: null,
    ascensor: false, generador: false, parqueaderos: false, guardiania: false,
    areas_comunales: false, uso_mixto: false, estado: 'Buen estado',
  };
}
export function detallesQuintaVacio(): DetallesQuinta {
  return {
    area_total_ha_m2: null, area_construida_m2: null, habitaciones: null, banos: null,
    clasificacion: 'Quinta recreacional', casa_principal: false, casas_huespedes: false,
    piscina: false, cancha_deportiva: false, area_agricola: false, agua_riego: false,
    acceso_pavimentado: false,
  };
}

const SI = 'Sí';
const NO = 'No';
const sino = (b: boolean) => (b ? SI : NO);
const n = (v: number | null) => (v != null ? String(v) : '0');

/**
 * Convierte los detalles específicos del tipo de propiedad a los campos reales que
 * entiende `finalinmobiliaria/Propiedades` (mismos nombres que
 * `inmobiliaria_fenix/src/app/models/property.ts`). Los campos sin equivalente directo
 * (ej. "acepta mascotas", "energía trifásica") se listan en `CaracteristicasInternas` /
 * `SeguridadAreasLibres` para no perderlos, y el objeto completo se guarda también tal
 * cual en `detalleCaptacion` como respaldo — nada se descarta.
 */
export function mapearDetallesACamposReales(
  tipo: TipoPropiedadKey,
  d: {
    casa: DetallesCasa; departamento: DetallesDep; terreno: DetallesTerreno; local: DetallesLocal;
    bodega: DetallesBodega; edificio: DetallesEdificio; quinta: DetallesQuinta;
  },
): Partial<PropiedadFirestore> & Record<string, unknown> {
  const caracteristicas: string[] = [];
  const seguridad: string[] = [];
  const campos: Partial<PropiedadFirestore> & Record<string, unknown> = {};

  switch (tipo) {
    case 'casa': {
      const c = d.casa;
      campos.HAB = n(c.habitaciones);
      campos.BNO = n(c.banos_completos);
      campos.BanosCompletos = n(c.banos_completos);
      campos.BanosSociales = n(c.medios_banos);
      campos.AreaCons = n(c.area_construida_m2);
      campos.AreaTerreno = n(c.area_terreno_m2);
      campos.GRJ = sino(c.garaje);
      campos.BDG = sino(c.bodega);
      campos.LVD = sino(c.lavanderia);
      campos.GarantiaAliquot = c.alicuota != null ? String(c.alicuota) : undefined;
      if (c.pisos != null) caracteristicas.push(`${c.pisos} pisos`);
      if (c.jardin) caracteristicas.push('Jardín');
      if (c.terraza) caracteristicas.push('Terraza');
      if (c.piscina) caracteristicas.push('Piscina');
      if (c.acepta_mascotas) caracteristicas.push('Acepta mascotas');
      if (c.acepta_iva) caracteristicas.push('Acepta IVA');
      break;
    }
    case 'departamento': {
      const dp = d.departamento;
      campos.HAB = n(dp.habitaciones);
      campos.BNO = n(dp.banos_completos);
      campos.BanosCompletos = n(dp.banos_completos);
      campos.BanosSociales = n(dp.medios_banos);
      campos.AreaCons = n(dp.area_m2);
      campos.Piso = dp.piso_edificio != null ? String(dp.piso_edificio) : undefined;
      campos.ASC = sino(dp.ascensor);
      campos.GRJ = sino(dp.garaje);
      campos.BDG = sino(dp.bodega);
      campos.LVD = sino(dp.lavanderia);
      campos.GarantiaAliquot = dp.alicuota != null ? String(dp.alicuota) : undefined;
      if (dp.num_departamento) caracteristicas.push(`Depto. ${dp.num_departamento}`);
      if (dp.terraza_balcon) caracteristicas.push('Terraza / Balcón');
      if (dp.conserje) seguridad.push('Conserje');
      if (dp.acepta_mascotas) caracteristicas.push('Acepta mascotas');
      if (dp.acepta_iva) caracteristicas.push('Acepta IVA');
      break;
    }
    case 'terreno': {
      const t = d.terreno;
      campos.AreaTerreno = n(t.area_total_m2);
      campos.AreaTotalTerreno = n(t.area_total_m2);
      campos.Frente = t.frente_ml != null ? String(t.frente_ml) : undefined;
      campos.Fondo = t.fondo_ml != null ? String(t.fondo_ml) : undefined;
      campos.Topografia = t.topografia;
      campos.Edificabilidad =
        t.pisos_permitidos_iprus != null ? `${t.pisos_permitidos_iprus} pisos permitidos (IPRUS)` : undefined;
      campos.EstadoDocumentos = t.escritura_titulo ? 'Con escritura/título' : 'Sin escritura confirmada';
      campos.ServiciosBasicos = t.services_basicos ? ['Servicios básicos disponibles'] : [];
      const usos = Object.entries(t.usoSuelo)
        .filter(([, v]) => v)
        .map(([k]) => k);
      campos.UsoSuelo = usos.length > 0 ? usos.join(', ') : undefined;
      caracteristicas.push(`Forma ${t.forma}`);
      if (t.iprus_actualizado) caracteristicas.push('IPRUS actualizado');
      if (t.cerramiento) seguridad.push('Cerramiento');
      break;
    }
    case 'local': {
      const l = d.local;
      campos.AreaCons = n(l.area_m2);
      campos.Piso = l.piso;
      if (l.altura_libre_m != null) caracteristicas.push(`Altura libre ${l.altura_libre_m}m`);
      if (l.frente_vitrina_ml != null) caracteristicas.push(`Vitrina ${l.frente_vitrina_ml}ml`);
      if (l.bano_propio) caracteristicas.push('Baño propio');
      if (l.parqueadero) seguridad.push('Parqueadero');
      if (l.vitrina_calle) caracteristicas.push('Vitrina a la calle');
      if (l.acceso_vehicular) seguridad.push('Acceso vehicular');
      if (l.bodega_deposito) caracteristicas.push('Bodega / depósito');
      if (l.cocina_equipada) caracteristicas.push('Cocina equipada');
      const usos = Object.entries(l.usoPermitido)
        .filter(([, v]) => v)
        .map(([k]) => k);
      campos.UsoSuelo = usos.length > 0 ? usos.join(', ') : undefined;
      break;
    }
    case 'bodega': {
      const b = d.bodega;
      campos.AreaCons = n(b.area_total_m2);
      campos.Frente = b.frente_ml != null ? String(b.frente_ml) : undefined;
      if (b.altura_libre_m != null) caracteristicas.push(`Altura libre ${b.altura_libre_m}m`);
      caracteristicas.push(`Piso ${b.tipo_piso}`);
      if (b.oficinas_incluidas) caracteristicas.push(`Oficinas incluidas (${n(b.area_oficinas_m2)} m²)`);
      if (b.acceso_vehicular_rampa) seguridad.push('Rampa vehicular');
      if (b.puerta_embarque) caracteristicas.push('Puerta de embarque');
      if (b.grua_puente) caracteristicas.push('Grúa puente');
      if (b.banos) caracteristicas.push('Baños');
      if (b.patio_maniobras) caracteristicas.push('Patio de maniobras');
      if (b.energia_trifasica) caracteristicas.push('Energía trifásica');
      break;
    }
    case 'edificio': {
      const e = d.edificio;
      campos.AreaCons = n(e.area_construida_total_m2);
      campos.AreaTerreno = n(e.area_terreno_m2);
      campos.ASC = sino(e.ascensor);
      caracteristicas.push(`${n(e.numero_pisos)} pisos`, `${n(e.numero_deptos)} departamentos`, e.estado);
      if (e.generador) seguridad.push('Generador');
      if (e.parqueaderos) seguridad.push('Parqueaderos');
      if (e.guardiania) seguridad.push('Guardianía');
      if (e.areas_comunales) caracteristicas.push('Áreas comunales');
      if (e.uso_mixto) caracteristicas.push('Uso mixto');
      break;
    }
    case 'quinta': {
      const q = d.quinta;
      campos.HAB = n(q.habitaciones);
      campos.BNO = n(q.banos);
      campos.AreaCons = n(q.area_construida_m2);
      campos.AreaTerreno = n(q.area_total_ha_m2);
      caracteristicas.push(q.clasificacion);
      if (q.casa_principal) caracteristicas.push('Casa principal');
      if (q.casas_huespedes) caracteristicas.push('Casa de huéspedes');
      if (q.piscina) caracteristicas.push('Piscina');
      if (q.cancha_deportiva) caracteristicas.push('Cancha deportiva');
      if (q.area_agricola) caracteristicas.push('Área agrícola');
      if (q.agua_riego) caracteristicas.push('Agua de riego');
      if (q.acceso_pavimentado) seguridad.push('Acceso pavimentado');
      break;
    }
  }

  campos.CaracteristicasInternas = caracteristicas;
  campos.SeguridadAreasLibres = seguridad;
  campos['detalleCaptacion'] = { tipo, ...d[tipo] };

  for (const key of Object.keys(campos)) {
    if ((campos as Record<string, unknown>)[key] === undefined) delete (campos as Record<string, unknown>)[key];
  }
  return campos;
}
