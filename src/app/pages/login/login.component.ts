import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  async iniciarSesion() {
    this.error.set(null);
    this.cargando.set(true);
    try {
      const esAdmin = await this.authService.logInWithEmailAndPassword({
        email: this.email,
        password: this.password,
      });
      if (!esAdmin) {
        this.error.set('Esta cuenta no tiene permiso de administrador en Fenix EC.');
        await this.authService.logOut();
        return;
      }
      this.router.navigate(['/real']);
    } catch (e: any) {
      this.error.set('No se pudo iniciar sesión. Revisa el correo y la contraseña.');
      console.error(e);
    } finally {
      this.cargando.set(false);
    }
  }
}
