import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FirestorePropiedadesService } from '../../services/firestore-propiedades.service';
import { AuthService } from '../../services/auth.service';
import { PropiedadFirestore } from '../../models/propiedad-firestore.model';

interface FotoPendiente {
  file: File;
  previewUrl: string;
}

/**
 * Segundo flujo de captación: propiedades que otra inmobiliaria o un cliente aliado
 * ya tiene lista (fotos + descripción) y comparte con Fenix EC para promocionarla
 * también. A diferencia de /captura, aquí NO hay foto de letrero ni GPS obligatorio
 * — solo se suben las fotos que enviaron y se pega/edita la descripción.
 *
 * Igual que /captura, escribe en `finalinmobiliaria/Propiedades` con Estado: "Borrador".
 * Dos botones de guardado: "Guardar como Borrador" (pasa por /real) o "Facebook"
 * (solo admin: guarda y publica de una vez, sin pasar por la aprobación).
 */
@Component({
  selector: 'app-carga-directa',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './carga-directa.component.html',
  styleUrl: './carga-directa.component.scss',
})
export class CargaDirectaComponent {
  private readonly firestoreSvc = inject(FirestorePropiedadesService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  TipoPropiedad = 'Casa';
  Modalidad: 'Venta' | 'Renta' = 'Venta';
  Precio: number | null = null;
  CIUDAD = 'Cuenca';
  Direccion_Sector = '';
  HAB: number | null = null;
  BNO: number | null = null;
  AreaCons: number | null = null;
  AreaTerreno: number | null = null;
  Amoblado: 'Sí' | 'No' = 'No';
  Extras = '';
  compartidaPor = '';
  linkMapa = '';

  readonly fotos = signal<FotoPendiente[]>([]);
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

  private formularioValido(): string | null {
    if (!this.Direccion_Sector.trim()) return 'Falta la dirección/sector.';
    if (!this.Precio || this.Precio <= 0) return 'Falta el precio.';
    if (!this.compartidaPor.trim()) return 'Indica qué inmobiliaria o contacto la compartió.';
    if (this.fotos().length === 0) return 'Agrega al menos una foto.';
    return null;
  }

  private construirDatos(ipd: string): Omit<PropiedadFirestore, 'id' | 'imagenes'> {
    return {
      IPD: ipd,
      TipoPropiedad: this.TipoPropiedad,
      Estado: 'Borrador',
      CIUDAD: this.CIUDAD,
      Direccion_Sector: this.Direccion_Sector.trim(),
      Precio_Venta: this.Modalidad === 'Venta' ? String(this.Precio) : undefined,
      Precio_Renta: this.Modalidad === 'Renta' ? String(this.Precio) : undefined,
      HAB: this.HAB != null ? String(this.HAB) : '0',
      BNO: this.BNO != null ? String(this.BNO) : '0',
      AreaCons: this.AreaCons != null ? String(this.AreaCons) : '0',
      AreaTerreno: this.AreaTerreno != null ? String(this.AreaTerreno) : '0',
      Amoblado: this.Amoblado,
      Extras: this.Extras.trim(),
      LinkMapa: this.linkMapa.trim() || undefined,
      origenCaptacion: 'compartida',
      compartidaPor: this.compartidaPor.trim(),
    };
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
      `Vas a guardar y publicar de inmediato "${this.TipoPropiedad} · ${this.Direccion_Sector}" en Facebook, ` +
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
    this.TipoPropiedad = 'Casa';
    this.Modalidad = 'Venta';
    this.Precio = null;
    this.Direccion_Sector = '';
    this.HAB = null;
    this.BNO = null;
    this.AreaCons = null;
    this.AreaTerreno = null;
    this.Amoblado = 'No';
    this.Extras = '';
    this.compartidaPor = '';
    this.linkMapa = '';
    this.fotos.set([]);
  }

  cerrarSesion() {
    this.authService.logOut();
    this.router.navigate(['/login']);
  }
}
