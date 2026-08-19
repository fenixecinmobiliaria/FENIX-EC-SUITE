import { Routes } from '@angular/router';
import { ColaAprobacionComponent } from './pages/cola-aprobacion/cola-aprobacion.component';
import { AprobacionDetalleComponent } from './pages/aprobacion-detalle/aprobacion-detalle.component';
import { LoginComponent } from './pages/login/login.component';
import { DatosRealesComponent } from './pages/datos-reales/datos-reales.component';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', component: ColaAprobacionComponent },
  { path: 'aprobar/:id', component: AprobacionDetalleComponent },
  { path: 'login', component: LoginComponent },
  { path: 'real', component: DatosRealesComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
