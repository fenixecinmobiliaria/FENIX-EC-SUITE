import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProspectosService } from '../../services/prospectos.service';
import { EstadoProspecto } from '../../models/prospecto.model';

/**
 * Lista de solo lectura de los prospectos del captador logueado — para retomar los
 * que quedaron pendientes ("va a consultar", "no contesta"). Las acciones (marcar
 * llamada, aceptar, eliminar) viven todas en /captura, para no duplicar esa lógica.
 */
@Component({
  selector: 'app-prospectos',
  standalone: true,
  imports: [CommonModule, AsyncPipe, DatePipe, RouterLink],
  templateUrl: './prospectos.component.html',
  styleUrl: './prospectos.component.scss',
})
export class ProspectosComponent {
  private readonly svc = inject(ProspectosService);

  prospectos$ = this.svc.misProspectos$();

  claseEstado(estado: EstadoProspecto): string {
    switch (estado) {
      case 'Aceptó': return 'estado--aceptado';
      case 'Rechazó': return 'estado--rechazado';
      case 'Va a consultar': return 'estado--consultar';
      case 'No contesta': return 'estado--nocontesta';
      default: return 'estado--porllamar';
    }
  }
}
