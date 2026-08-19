import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Captador, CaptadoresService } from '../../services/captadores.service';

/** Pantalla admin: crear, renombrar y eliminar cuentas de captador (solo iniciales + contraseña). */
@Component({
  selector: 'app-captadores',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './captadores.component.html',
  styleUrl: './captadores.component.scss',
})
export class CaptadoresComponent {
  private readonly svc = inject(CaptadoresService);

  readonly captadores = signal<Captador[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly exito = signal<string | null>(null);

  // Formulario "nuevo captador"
  nuevasIniciales = '';
  nuevaPassword = '';
  readonly creando = signal(false);

  // Edición inline de iniciales
  editandoUid = signal<string | null>(null);
  inicialesEnEdicion = '';
  readonly guardandoEdicion = signal(false);

  readonly eliminandoUid = signal<string | null>(null);

  constructor() {
    this.cargar();
  }

  private async cargar() {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const lista = await this.svc.listar();
      this.captadores.set(lista.sort((a, b) => a.iniciales.localeCompare(b.iniciales)));
    } catch (e: any) {
      console.error(e);
      this.error.set(e?.message || 'No se pudo cargar la lista de captadores.');
    } finally {
      this.cargando.set(false);
    }
  }

  async crearCaptador() {
    this.error.set(null);
    this.exito.set(null);

    const iniciales = this.nuevasIniciales.trim();
    if (!iniciales || !this.nuevaPassword) {
      this.error.set('Completa las iniciales y la contraseña.');
      return;
    }
    if (this.nuevaPassword.length < 6) {
      this.error.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    this.creando.set(true);
    try {
      const nuevo = await this.svc.crear(iniciales, this.nuevaPassword);
      this.exito.set(`Captador "${nuevo.iniciales}" creado. Comparte sus credenciales por tu cuenta.`);
      this.nuevasIniciales = '';
      this.nuevaPassword = '';
      await this.cargar();
    } catch (e: any) {
      console.error(e);
      this.error.set(e?.message || 'No se pudo crear el captador.');
    } finally {
      this.creando.set(false);
    }
  }

  empezarEdicion(c: Captador) {
    this.editandoUid.set(c.uid);
    this.inicialesEnEdicion = c.iniciales;
  }

  cancelarEdicion() {
    this.editandoUid.set(null);
    this.inicialesEnEdicion = '';
  }

  async guardarEdicion(uid: string) {
    const iniciales = this.inicialesEnEdicion.trim();
    if (!iniciales) return;

    this.guardandoEdicion.set(true);
    this.error.set(null);
    try {
      await this.svc.actualizarIniciales(uid, iniciales);
      this.editandoUid.set(null);
      await this.cargar();
    } catch (e: any) {
      console.error(e);
      this.error.set(e?.message || 'No se pudieron guardar las iniciales.');
    } finally {
      this.guardandoEdicion.set(false);
    }
  }

  async eliminarCaptador(c: Captador) {
    const confirmado = window.confirm(
      `¿Eliminar la cuenta de "${c.iniciales}"? Ya no podrá iniciar sesión ni usar la app de captación.`,
    );
    if (!confirmado) return;

    this.eliminandoUid.set(c.uid);
    this.error.set(null);
    try {
      await this.svc.eliminar(c.uid);
      await this.cargar();
    } catch (e: any) {
      console.error(e);
      this.error.set(e?.message || 'No se pudo eliminar el captador.');
    } finally {
      this.eliminandoUid.set(null);
    }
  }
}
