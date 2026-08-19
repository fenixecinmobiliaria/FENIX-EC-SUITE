import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/**
 * Pantalla de inicio tras el login — punto central para moverse entre las
 * pantallas sin tener que cerrar sesión y volver a entrar cada vez.
 */
@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss',
})
export class InicioComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly esAdmin = signal(false);
  readonly correo = this.authService.getCurrentUser()?.email ?? '';

  constructor() {
    const uid = this.authService.getCurrentUser()?.uid;
    if (uid) {
      this.authService.obtenerRol(uid).then((rol) => this.esAdmin.set(rol === 'admin'));
    }
  }

  cerrarSesion() {
    this.authService.logOut();
    this.router.navigate(['/login']);
  }
}
