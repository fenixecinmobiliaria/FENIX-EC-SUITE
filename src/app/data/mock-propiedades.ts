import { Propiedad } from '../models/propiedad.model';

/**
 * Datos de prueba — simulan propiedades recién capturadas en campo (Estado: Borrador),
 * pendientes de pasar por la pantalla de aprobación antes de publicarse en el catálogo
 * público, el bot de WhatsApp y Facebook.
 *
 * Las imágenes son placeholders de picsum.photos (URLs estables por seed) mientras se
 * conecta a Firebase Storage real.
 */
function fotosDe(seeds: string[]): string[] {
  return seeds.map((seed) => `https://picsum.photos/seed/${seed}/800/600`);
}

export const MOCK_PROPIEDADES: Propiedad[] = [
  {
    id: 'draft-001',
    IPD: 'FX-2026-014',
    agenciaId: 'fenix-ec',
    TipoPropiedad: 'Casa',
    Estado: 'Borrador',
    CIUDAD: 'Cuenca',
    Direccion_Sector: 'Av. Ordóñez Lasso, sector Puertas del Sol',
    Precio_Venta: 189000,
    HAB: 4,
    BNO: 3,
    AreaCons: 280,
    AreaTerreno: 320,
    Amoblado: false,
    imagenes: fotosDe(['fx14-fachada', 'fx14-sala', 'fx14-cocina', 'fx14-comedor', 'fx14-hab1', 'fx14-patio']),
    fotoPortadaUrl: `https://picsum.photos/seed/fx14-fachada/800/600`,
    Extras: 'Casa de dos plantas con acabados de porcelanato, cocina americana, jardín amplio y garaje para 2 vehículos.',
    capturadoPor: 'Agente Mónica Torres',
    fechaCaptura: '2026-08-18T15:20:00-05:00',
  },
  {
    id: 'draft-002',
    IPD: 'FX-2026-015',
    agenciaId: 'fenix-ec',
    TipoPropiedad: 'Departamento',
    Estado: 'Borrador',
    CIUDAD: 'Cuenca',
    Direccion_Sector: 'Challuabamba, cerca del Mall del Río',
    Precio_Renta: 480,
    HAB: 2,
    BNO: 2,
    AreaCons: 95,
    AreaTerreno: 0,
    Amoblado: true,
    imagenes: fotosDe(['fx15-sala', 'fx15-cocina', 'fx15-hab1', 'fx15-hab2', 'fx15-balcon']),
    fotoPortadaUrl: `https://picsum.photos/seed/fx15-sala/800/600`,
    Extras: 'Departamento amoblado, balcón con vista, incluye parqueadero y bodega.',
    capturadoPor: 'Agente Diego Ramírez',
    fechaCaptura: '2026-08-19T09:05:00-05:00',
  },
  {
    id: 'draft-003',
    IPD: 'FX-2026-016',
    agenciaId: 'fenix-ec',
    TipoPropiedad: 'Casa',
    Estado: 'Borrador',
    CIUDAD: 'Cuenca',
    Direccion_Sector: 'Sector Baguanchi, vía a Nulti',
    Precio_Venta: 145000,
    HAB: 3,
    BNO: 2,
    AreaCons: 190,
    AreaTerreno: 500,
    Amoblado: false,
    imagenes: fotosDe(['fx16-fachada', 'fx16-huerto', 'fx16-sala', 'fx16-cocina']),
    fotoPortadaUrl: `https://picsum.photos/seed/fx16-fachada/800/600`,
    Extras: 'Casa de un piso con huerto propio, ideal para quinta vacacional o vivienda familiar tranquila.',
    capturadoPor: 'Agente Mónica Torres',
    fechaCaptura: '2026-08-19T11:40:00-05:00',
  },
];
