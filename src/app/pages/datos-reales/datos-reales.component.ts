import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FirestorePropiedadesService } from '../../services/firestore-propiedades.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-datos-reales',
  standalone: true,
  imports: [CommonModule, AsyncPipe, RouterLink],
  templateUrl: './datos-reales.component.html',
  styleUrl: './datos-reales.component.scss',
})
export class DatosRealesComponent {
  private readonly firestoreSvc = inject(FirestorePropiedadesService);
  private readonly authService = inject(AuthService);

  borradores$ = this.firestoreSvc.borradoresReal$();

  cerrarSesion() {
    this.authService.logOut();
  }
}
