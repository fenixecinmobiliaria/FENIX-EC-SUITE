import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PropiedadesService } from '../../services/propiedades.service';

@Component({
  selector: 'app-cola-aprobacion',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cola-aprobacion.component.html',
  styleUrl: './cola-aprobacion.component.scss',
})
export class ColaAprobacionComponent {
  private readonly svc = inject(PropiedadesService);

  borradores = this.svc.borradores.bind(this.svc);
  publicadas = this.svc.publicadas.bind(this.svc);
}
