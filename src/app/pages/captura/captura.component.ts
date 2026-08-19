import { Component, NgZone, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FirestorePropiedadesService } from '../../services/firestore-propiedades.service';
import { AuthService } from '../../services/auth.service';
import { PropiedadFirestore } from '../../models/propiedad-firestore.model';
import {
  DetallesBodega, DetallesCasa, DetallesDep, DetallesEdificio, DetallesLocal, DetallesQuinta, DetallesTerreno,
  TIPOS_PROPIEDAD, TipoPropiedadKey,
  detallesBodegaVacio, detallesCasaVacio, detallesDepVacio, detallesEdificioVacio, detallesLocalVacio,
  detallesQuintaVacio, detallesTerrenoVacio, mapearDetallesACamposReales,
} from '../../models/detalle-tipo-propiedad';

interface FotoPendiente {
  file: File;
  previewUrl: string;
}

/**
 * Formulario de captación móvil — mismos parámetros y mismo diseño (dark/gold) que
 * `captacion-app` (el original), estandarizado para que ambos programas se vean y
 * pregunten lo mismo. Diferencia real: aquí se escribe directo en
 * `finalinmobiliaria/Propiedades` (Estado: "Borrador"), no en el Firebase aislado del
 * captacion-app viejo, y se permiten varias fotos (el original solo dejaba una).
 *
 * Dos botones de guardado:
 *  - "Guardar como Borrador": un admin la revisa/aprueba luego en /real.
 *  - "Facebook" (solo admin): guarda Y publica de una vez, sin pasar por /real.
 */
@Component({
  selector: 'app-captura',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './captura.component.html',
  styleUrl: './captura.component.scss',
})
export class CapturaComponent {
  private readonly firestoreSvc = inject(FirestorePropiedadesService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);

  readonly tipos = TIPOS_PROPIEDAD;

  tipo: TipoPropiedadKey | '' = '';
  Modalidad: 'Venta' | 'Renta' = 'Venta';
  Precio: number | null = null;
  CIUDAD = 'Cuenca';
  Direccion_Sector = '';
  Amoblado: 'Sí' | 'No' = 'No';
  Extras = '';
  contactoNombre = '';
  contactoTelefono = '';
  contactoEmail = '';

  detCasa: DetallesCasa = detallesCasaVacio();
  detDep: DetallesDep = detallesDepVacio();
  detTerreno: DetallesTerreno = detallesTerrenoVacio();
  detLocal: DetallesLocal = detallesLocalVacio();
  detBodega: DetallesBodega = detallesBodegaVacio();
  detEdificio: DetallesEdificio = detallesEdificioVacio();
  detQuinta: DetallesQuinta = detallesQuintaVacio();

  readonly fotos = signal<FotoPendiente[]>([]);
  readonly statusGps = signal('Sin capturar');
  private linkMapa = '';

  readonly esAdmin = signal(false);
  readonly guardando = signal(false);
  readonly publicando = signal(false);
  readonly error = signal<string | null>(null);
  readonly exito = signal<string | null>(null);

  constructor() {
    const uid = this.authService.getCurrentUser()?.uid;
    if (uid) {
      this.authService.obtenerRol(uid).then((rol) => this.esAdmin.set(rol === 'admin'));
    }
  }

  onFotosSeleccionadas(event: Event) {
    const input = event.target as HTMLInputElement;
    const archivos = input.files ? Array.from(input.files) : [];
    const nuevas: FotoPendiente[] = archivos.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    this.fotos.update((actuales) => [...actuales, ...nuevas]);
    input.value = '';
  }

  quitarFoto(index: number) {
    this.fotos.update((actuales) => actuales.filter((_, i) => i !== index));
  }

  capturarUbicacion() {
    if (!navigator.geolocation) {
      this.statusGps.set('Este dispositivo no soporta geolocalización.');
      return;
    }
    this.statusGps.set('Obteniendo ubicación…');
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        // El callback del GPS corre fuera de Angular (zone.js no lo parchea de forma
        // confiable) — sin este ngZone.run() el dato llega pero la pantalla no se
        // actualiza. El captacion-app original ya tenía este mismo workaround.
        this.ngZone.run(() => {
          const { latitude, longitude, accuracy } = posicion.coords;
          this.linkMapa = `https://www.google.com/maps?q=${latitude},${longitude}`;
          this.statusGps.set(`Capturada (±${Math.round(accuracy)}m)`);
        });
      },
      () => {
        this.ngZone.run(() => {
          this.statusGps.set('No se pudo obtener la ubicación. Revisa los permisos del navegador.');
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  private formularioValido(): string | null {
    if (!this.tipo) return 'Elige el tipo de propiedad.';
    if (!this.Direccion_Sector.trim()) return 'Falta la dirección/sector.';
    if (!this.Precio || this.Precio <= 0) return 'Falta el precio.';
    if (this.fotos().length === 0) return 'Agrega al menos una foto.';
    return null;
  }

  private construirDatos(ipd: string): Omit<PropiedadFirestore, 'id' | 'imagenes'> {
    const tipoInfo = TIPOS_PROPIEDAD.find((t) => t.key === this.tipo)!;
    const camposTipo = mapearDetallesACamposReales(this.tipo as TipoPropiedadKey, {
      casa: this.detCasa,
      departamento: this.detDep,
      terreno: this.detTerreno,
      local: this.detLocal,
      bodega: this.detBodega,
      edificio: this.detEdificio,
      quinta: this.detQuinta,
    });

    const contacto = [this.contactoNombre, this.contactoTelefono, this.contactoEmail].filter(Boolean).join(' · ');
    const extrasCompleto = [this.Extras.trim(), contacto ? `Contacto: ${contacto}` : null].filter(Boolean).join('\n\n');

    return {
      IPD: ipd,
      TipoPropiedad: tipoInfo.nombreReal,
      Estado: 'Borrador',
      CIUDAD: this.CIUDAD,
      Direccion_Sector: this.Direccion_Sector.trim(),
      Precio_Venta: this.Modalidad === 'Venta' ? String(this.Precio) : undefined,
      Precio_Renta: this.Modalidad === 'Renta' ? String(this.Precio) : undefined,
      HAB: '0',
      BNO: '0',
      AreaCons: '0',
      AreaTerreno: '0',
      Amoblado: this.Amoblado,
      Extras: extrasCompleto,
      LinkMapa: this.linkMapa || undefined,
      origenCaptacion: 'campo',
      TipoTransaccion: this.Modalidad,
      ...camposTipo,
    } as Omit<PropiedadFirestore, 'id' | 'imagenes'>;
  }

  async guardarBorrador() {
    this.error.set(null);
    this.exito.set(null);

    const problema = this.formularioValido();
    if (problema) {
      this.error.set(problema);
      return;
    }

    this.guardando.set(true);
    try {
      const ipd = await this.firestoreSvc.generarSiguienteIPD();
      const datos = this.construirDatos(ipd);
      const archivos = this.fotos().map((f) => f.file);
      await this.firestoreSvc.crearBorrador(datos, archivos);

      this.exito.set(`Propiedad ${ipd} guardada como Borrador. Un administrador la revisará antes de publicarla.`);
      this.limpiarFormulario();
    } catch (e) {
      console.error('Error al guardar el borrador:', e);
      this.error.set('No se pudo guardar. Revisa tu conexión e intenta de nuevo.');
    } finally {
      this.guardando.set(false);
    }
  }

  /** Guarda Y publica de inmediato en Facebook (solo admin) — sin pasar por /real. */
  async guardarYPublicarFacebook() {
    this.error.set(null);
    this.exito.set(null);

    const problema = this.formularioValido();
    if (problema) {
      this.error.set(problema);
      return;
    }

    const confirmado = window.confirm(
      `Vas a guardar y publicar de inmediato esta propiedad en Facebook, ` +
        'y quedará activa en el sitio y el bot de WhatsApp. La primera foto que agregaste será la portada. ¿Confirmas?',
    );
    if (!confirmado) return;

    this.publicando.set(true);
    try {
      const ipd = await this.firestoreSvc.generarSiguienteIPD();
      const datos = this.construirDatos(ipd);
      const archivos = this.fotos().map((f) => f.file);
      const nuevoId = await this.firestoreSvc.crearBorrador(datos, archivos);

      const resultado = await this.firestoreSvc.publicarPorId(nuevoId);

      this.exito.set(
        `Propiedad ${ipd} publicada en Facebook y activada.` +
          (resultado.facebookPostUrl ? ` Ver post: ${resultado.facebookPostUrl}` : ''),
      );
      this.limpiarFormulario();
    } catch (e: any) {
      console.error('Error al guardar y publicar:', e);
      this.error.set(
        e?.message ||
          'Se guardó como Borrador pero no se pudo publicar en Facebook. Revísala desde /real e inténtalo de nuevo ahí.',
      );
    } finally {
      this.publicando.set(false);
    }
  }

  private limpiarFormulario() {
    this.tipo = '';
    this.Modalidad = 'Venta';
    this.Precio = null;
    this.Direccion_Sector = '';
    this.Amoblado = 'No';
    this.Extras = '';
    this.contactoNombre = '';
    this.contactoTelefono = '';
    this.contactoEmail = '';
    this.detCasa = detallesCasaVacio();
    this.detDep = detallesDepVacio();
    this.detTerreno = detallesTerrenoVacio();
    this.detLocal = detallesLocalVacio();
    this.detBodega = detallesBodegaVacio();
    this.detEdificio = detallesEdificioVacio();
    this.detQuinta = detallesQuintaVacio();
    this.fotos.set([]);
    this.statusGps.set('Sin capturar');
    this.linkMapa = '';
  }

  cerrarSesion() {
    this.authService.logOut();
    this.router.navigate(['/login']);
  }
}
