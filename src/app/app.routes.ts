import { Routes } from '@angular/router';
import { ColaAprobacionComponent } from './pages/cola-aprobacion/cola-aprobacion.component';
import { AprobacionDetalleComponent } from './pages/aprobacion-detalle/aprobacion-detalle.component';

export const routes: Routes = [
  { path: '', component: ColaAprobacionComponent },
  { path: 'aprobar/:id', component: AprobacionDetalleComponent },
  { path: '**', redirectTo: '' },
];
