import { Component, NgZone, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProspectosService } from '../../services/prospectos.service';
import { AuthService } from '../../services/auth.service';
import { EstadoProspecto, Prospecto } from '../../models/prospecto.model';
import { TIPOS_PROPIEDAD, TipoPropiedadKey } from '../../models/detalle-tipo-propiedad';

/**
 * Pantalla única de "Nueva captación" — así es como funciona el trabajo real:
 *  1. Ves un letrero → foto del anuncio + GPS + tipo de propiedad + venta/renta +
 *     sector de referencia → "Guardar".
 *  2. En la MISMA pantalla aparecen los botones para registrar qué te dijeron al
 *     llamar: No contesta / Va a consultar / Rechazó / Aceptó / Eliminar.
 *  3. Solo si el dueño confirma que quiere el servicio ("Aceptó") se abre la
 *     siguiente pantalla (/captura-completar) para tomar el resto de fotos y llenar
 *     las características según el tipo de propiedad.
 *  4. Con cualquier otra respuesta, la pantalla vuelve a quedar lista para el
 *     siguiente letrero — el prospecto queda guardado en "Mis prospectos" por si hay
 *     que retomarlo después.
 */
@Component({
  selector: 'app-prospecto-nuevo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './prospecto-nuevo.component.html',
  styleUrl: './prospecto-nuevo.component.scss',
})
export class ProspectoNuevoComponent {
  private readonly prospectosSvc = inject(ProspectosService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly ngZone = inject(NgZone);

  readonly tipos = TIPOS_PROPIEDAD;

  // --- Formulario de creación (fase 1) ---
  fotoFile: File | null = null;
  readonly fotoPreview = signal<string | null>(null);
  tipo: TipoPropiedadKey | '' = '';
  Modalidad: 'Venta' | 'Renta' = 'Venta';
  CIUDAD = 'Cuenca';
  Direccion_Sector = '';
  private linkMapa = '';
  readonly statusGps = signal('Sin capturar');

  // --- Prospecto activo (recién creado, o cargado desde "Mis prospectos") ---
  readonly prospectoActivo = signal<Prospecto | null>(null);
  readonly registrandoIntento = signal(false);

  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly exito = signal<string | null>(null);

  readonly misIniciales = signal('');

  constructor() {
    const uid = this.authService.getCurrentUser()?.uid;
    if (uid) {
      this.authService.obtenerPerfil(uid).then((p) => {
        this.misIniciales.set(p.iniciales || this.authService.getCurrentUser()?.email || '');
      });
    }

    const prospectoId = this.route.snapshot.queryParamMap.get('prospectoId');
    if (prospectoId) {
      this.prospectosSvc.porId(prospectoId).then((p) => {
        if (p) this.prospectoActivo.set(p);
      });
    }
  }

  onFotoCapturada(event: Event) {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;
    this.fotoFile = archivo;
    this.fotoPreview.set(URL.createObjectURL(archivo));
  }

  capturarUbicacion() {
    if (!navigator.geolocation) {
      this.statusGps.set('Este dispositivo no soporta geolocalización.');
      return;
    }
    this.statusGps.set('Obteniendo ubicación…');
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
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

  async guardar() {
    this.error.set(null);
    this.exito.set(null);

    if (!this.fotoFile) {
      this.error.set('Toma la foto del anuncio/letrero primero.');
      return;
    }
    if (!this.tipo) {
      this.error.set('Elige el tipo de propiedad.');
      return;
    }

    this.guardando.set(true);
    try {
      const fotoUrl = await this.prospectosSvc.subirFotoLetrero(this.fotoFile);
      const capturadoPor = this.misIniciales() || this.authService.getCurrentUser()?.email || 'Desconocido';
      const id = await this.prospectosSvc.crear({
        fotoLetrero: fotoUrl,
        linkMapa: this.linkMapa || undefined,
        CIUDAD: this.CIUDAD || undefined,
        Direccion_Sector: this.Direccion_Sector.trim() || undefined,
        tipo: this.tipo,
        Modalidad: this.Modalidad,
        capturadoPor,
      });

      // Mostramos de inmediato los botones de seguimiento, sin recargar de Firestore.
      this.prospectoActivo.set({
        id,
        fotoLetrero: fotoUrl,
        linkMapa: this.linkMapa || undefined,
        CIUDAD: this.CIUDAD || undefined,
        Direccion_Sector: this.Direccion_Sector.trim() || undefined,
        tipo: this.tipo,
        Modalidad: this.Modalidad,
        capturadoPor,
        capturadoPorUid: this.authService.getCurrentUser()?.uid ?? '',
        estado: 'Por llamar',
        intentos: [],
        fechaCreacion: Date.now(),
      });
    } catch (e) {
      console.error('Error al guardar el prospecto:', e);
      this.error.set('No se pudo guardar. Revisa tu conexión e intenta de nuevo.');
    } finally {
      this.guardando.set(false);
    }
  }

  async marcar(estado: EstadoProspecto) {
    const p = this.prospectoActivo();
    if (!p?.id) return;

    if (estado === 'Aceptó') {
      this.registrandoIntento.set(true);
      try {
        await this.prospectosSvc.registrarIntento(p.id, estado);
        this.router.navigate(['/captura-completar'], { queryParams: { prospectoId: p.id } });
      } finally {
        this.registrandoIntento.set(false);
      }
      return;
    }

    let nota: string | undefined;
    if (estado === 'Va a consultar' || estado === 'No contesta' || estado === 'Rechazó') {
      nota = window.prompt('¿Alguna nota sobre la llamada? (opcional)') || undefined;
    }

    this.registrandoIntento.set(true);
    try {
      await this.prospectosSvc.registrarIntento(p.id, estado, nota);
      this.exito.set(`Registrado: ${estado}. Listo para el siguiente letrero.`);
      this.reiniciarParaSiguiente();
    } catch (e) {
      console.error('Error al registrar el intento:', e);
      this.error.set('No se pudo registrar. Intenta de nuevo.');
    } finally {
      this.registrandoIntento.set(false);
    }
  }

  async eliminar() {
    const p = this.prospectoActivo();
    if (!p?.id) return;
    const confirmado = window.confirm('¿Eliminar este prospecto? No se puede deshacer.');
    if (!confirmado) return;

    this.registrandoIntento.set(true);
    try {
      await this.prospectosSvc.eliminar(p.id);
      this.exito.set('Prospecto eliminado.');
      this.reiniciarParaSiguiente();
    } catch (e) {
      console.error('Error al eliminar el prospecto:', e);
      this.error.set('No se pudo eliminar. Intenta de nuevo.');
    } finally {
      this.registrandoIntento.set(false);
    }
  }

  private reiniciarParaSiguiente() {
    this.prospectoActivo.set(null);
    this.fotoFile = null;
    this.fotoPreview.set(null);
    this.tipo = '';
    this.Modalidad = 'Venta';
    this.Direccion_Sector = '';
    this.linkMapa = '';
    this.statusGps.set('Sin capturar');
    // Quita el prospectoId de la URL para no volver a cargar el mismo al refrescar.
    this.router.navigate(['/captura']);
  }

  cerrarSesion() {
    this.authService.logOut();
    this.router.navigate(['/login']);
  }
}
