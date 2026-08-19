import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Subscription } from 'rxjs';
import { FirestorePropiedadesService } from '../../services/firestore-propiedades.service';
import { PropiedadFirestore } from '../../models/propiedad-firestore.model';

/**
 * Igual que AprobacionDetalleComponent (mock) pero contra Firestore real.
 * En el esquema real NO hay un campo de "portada" separado: el sitio siempre
 * muestra `imagenes[0]` como portada, así que "elegir portada" es simplemente
 * mover esa foto a la primera posición del arreglo.
 */
@Component({
  selector: 'app-aprobacion-real-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DragDropModule],
  templateUrl: './aprobacion-real-detalle.component.html',
  styleUrl: './aprobacion-real-detalle.component.scss',
})
export class AprobacionRealDetalleComponent {
  private readonly svc = inject(FirestorePropiedadesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly id = this.route.snapshot.paramMap.get('id')!;
  private subscripcion?: Subscription;

  readonly propiedad = signal<PropiedadFirestore | null>(null);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly publicando = signal(false);
  readonly publicado = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.subscripcion = this.svc.porIdReal$(this.id).subscribe({
      next: (p) => {
        // Solo tomamos la primera carga como copia de trabajo local, para no pelear
        // con la edición del usuario si Firestore emite de nuevo mientras edita.
        if (!this.propiedad()) {
          this.propiedad.set(p ? structuredClone(p) : null);
        }
        this.cargando.set(false);
      },
      error: (e) => {
        console.error('Error al leer la propiedad real:', e);
        this.error.set('No se pudo cargar esta propiedad desde Firestore.');
        this.cargando.set(false);
      },
    });
  }

  ngOnDestroy() {
    this.subscripcion?.unsubscribe();
  }

  esPortada(url: string): boolean {
    return this.propiedad()?.imagenes?.[0] === url;
  }

  elegirPortada(url: string) {
    const p = this.propiedad();
    if (!p?.imagenes) return;
    const imagenes = [...p.imagenes];
    const idx = imagenes.indexOf(url);
    if (idx <= 0) return;
    moveItemInArray(imagenes, idx, 0);
    this.propiedad.set({ ...p, imagenes });
  }

  drop(event: CdkDragDrop<string[]>) {
    const p = this.propiedad();
    if (!p?.imagenes) return;
    const imagenes = [...p.imagenes];
    moveItemInArray(imagenes, event.previousIndex, event.currentIndex);
    this.propiedad.set({ ...p, imagenes });
  }

  async guardarCambios() {
    const p = this.propiedad();
    if (!p?.id) return;
    this.guardando.set(true);
    this.error.set(null);
    try {
      await this.svc.actualizarImagenes(p.id, p.imagenes ?? []);
      await this.svc.actualizarTexto(p.id, p.Extras ?? '');
    } catch (e) {
      console.error(e);
      this.error.set('No se pudieron guardar los cambios. Intenta de nuevo.');
    } finally {
      this.guardando.set(false);
    }
  }

  async aprobarYPublicar() {
    const p = this.propiedad();
    if (!p?.id) return;

    const modalidad = p.Precio_Venta ? 'VENTA' : 'RENTA';
    const confirmado = window.confirm(
      `Vas a publicar "${p.TipoPropiedad} · ${p.Direccion_Sector}" en ${modalidad} real.\n\n` +
        'Quedará visible de inmediato en el sitio web y el bot de WhatsApp podrá recomendarla ' +
        '(la publicación en Facebook todavía no está automatizada). ¿Confirmas?',
    );
    if (!confirmado) return;

    this.publicando.set(true);
    this.error.set(null);
    try {
      await this.svc.aprobarYPublicar(p);
      this.publicando.set(false);
      this.publicado.set(true);
      setTimeout(() => this.router.navigate(['/real']), 1600);
    } catch (e) {
      console.error(e);
      this.publicando.set(false);
      this.error.set('No se pudo publicar. Revisa tu conexión e intenta de nuevo.');
    }
  }
}
