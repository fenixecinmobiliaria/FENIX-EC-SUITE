import { Component, NgZone, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProspectosService } from '../../services/prospectos.service';
import { AuthService } from '../../services/auth.service';

/**
 * Fase 1 de la captación real: foto del anuncio/letrero + ubicación, ANTES de llamar
 * al dueño. Liviano a propósito — nada de tipo de propiedad ni detalles todavía,
 * porque en este punto ni siquiera se sabe si el dueño va a aceptar.
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
  private readonly ngZone = inject(NgZone);

  fotoFile: File | null = null;
  readonly fotoPreview = signal<string | null>(null);
  CIUDAD = 'Cuenca';
  Direccion_Sector = '';
  private linkMapa = '';
  readonly statusGps = signal('Sin capturar');

  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly exito = signal<string | null>(null);

  private iniciales = '';

  constructor() {
    const uid = this.authService.getCurrentUser()?.uid;
    if (uid) {
      this.authService.obtenerPerfil(uid).then((p) => (this.iniciales = p.iniciales || ''));
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

    this.guardando.set(true);
    try {
      const fotoUrl = await this.prospectosSvc.subirFotoLetrero(this.fotoFile);
      await this.prospectosSvc.crear({
        fotoLetrero: fotoUrl,
        linkMapa: this.linkMapa || undefined,
        CIUDAD: this.CIUDAD || undefined,
        Direccion_Sector: this.Direccion_Sector.trim() || undefined,
        capturadoPor: this.iniciales || this.authService.getCurrentUser()?.email || 'Desconocido',
      });

      this.exito.set('Prospecto guardado. Ahora llama al número del anuncio y registra qué te dijeron.');
      setTimeout(() => this.router.navigate(['/prospectos']), 1400);
    } catch (e) {
      console.error('Error al guardar el prospecto:', e);
      this.error.set('No se pudo guardar. Revisa tu conexión e intenta de nuevo.');
    } finally {
      this.guardando.set(false);
    }
  }
}
