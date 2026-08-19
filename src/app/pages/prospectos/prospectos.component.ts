import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProspectosService } from '../../services/prospectos.service';
import { EstadoProspecto, Prospecto } from '../../models/prospecto.model';

/** Lista de prospectos del captador logueado, con el estado de cada llamada. */
@Component({
  selector: 'app-prospectos',
  standalone: true,
  imports: [CommonModule, AsyncPipe, DatePipe, RouterLink],
  templateUrl: './prospectos.component.html',
  styleUrl: './prospectos.component.scss',
})
export class ProspectosComponent {
  private readonly svc = inject(ProspectosService);
  private readonly router = inject(Router);

  prospectos$ = this.svc.misProspectos$();

  async marcar(p: Prospecto, estado: EstadoProspecto) {
    let nota: string | undefined;
    if (estado === 'Va a consultar' || estado === 'No contesta' || estado === 'Rechazó') {
      nota = window.prompt('¿Alguna nota sobre la llamada? (opcional)') || undefined;
    }
    await this.svc.registrarIntento(p.id!, estado, nota);
  }

  aceptar(p: Prospecto) {
    this.router.navigate(['/captura'], { queryParams: { prospectoId: p.id } });
  }

  async eliminar(p: Prospecto) {
    const confirmado = window.confirm('¿Eliminar este prospecto? No se puede deshacer.');
    if (!confirmado) return;
    await this.svc.eliminar(p.id!);
  }

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
