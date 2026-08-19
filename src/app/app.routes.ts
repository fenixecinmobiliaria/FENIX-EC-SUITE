import { Routes } from '@angular/router';
import { ColaAprobacionComponent } from './pages/cola-aprobacion/cola-aprobacion.component';
import { AprobacionDetalleComponent } from './pages/aprobacion-detalle/aprobacion-detalle.component';
import { LoginComponent } from './pages/login/login.component';
import { DatosRealesComponent } from './pages/datos-reales/datos-reales.component';
import { authGuard, adminGuard } from './auth.guard';
import { CapturaComponent } from './pages/captura/captura.component';
import { CargaDirectaComponent } from './pages/carga-directa/carga-directa.component';
import { AprobacionRealDetalleComponent } from './pages/aprobacion-real-detalle/aprobacion-real-detalle.component';

export const routes: Routes = [
  { path: '', component: ColaAprobacionComponent },
  { path: 'aprobar/:id', component: AprobacionDetalleComponent },
  { path: 'login', component: LoginComponent },
  { path: 'real', component: DatosRealesComponent, canActivate: [adminGuard] },
  { path: 'real/aprobar/:id', component: AprobacionRealDetalleComponent, canActivate: [adminGuard] },
  { path: 'captura', component: CapturaComponent, canActivate: [authGuard] },
  { path: 'carga-directa', component: CargaDirectaComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
