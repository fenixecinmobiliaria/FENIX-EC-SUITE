import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { PropiedadesService } from '../../services/propiedades.service';
import { Propiedad } from '../../models/propiedad.model';

@Component({
  selector: 'app-aprobacion-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DragDropModule],
  templateUrl: './aprobacion-detalle.component.html',
  styleUrl: './aprobacion-detalle.component.scss',
})
export class AprobacionDetalleComponent {
  private readonly svc = inject(PropiedadesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly id = this.route.snapshot.paramMap.get('id')!;

  /** Copia de trabajo local: los cambios solo se confirman en el servicio al aprobar
   *  (o se sincronizan en vivo, según la acción — ver métodos abajo). */
  readonly propiedad = signal<Propiedad | undefined>(this.clonar(this.svc.porId(this.id)));

  readonly noEncontrada = computed(() => !this.propiedad());

  readonly textoEditado = signal(this.propiedad()?.Extras ?? '');
  readonly publicando = signal(false);
  readonly publicado = signal(false);

  private clonar(p: Propiedad | undefined): Propiedad | undefined {
    return p ? structuredClone(p) : undefined;
  }

  esPortada(url: string): boolean {
    return this.propiedad()?.fotoPortadaUrl === url;
  }

  elegirPortada(url: string) {
    const p = this.propiedad();
    if (!p) return;
    p.fotoPortadaUrl = url;
    this.propiedad.set({ ...p });
  }

  drop(event: CdkDragDrop<string[]>) {
    const p = this.propiedad();
    if (!p) return;
    const imagenes = [...p.imagenes];
    moveItemInArray(imagenes, event.previousIndex, event.currentIndex);
    p.imagenes = imagenes;
    this.propiedad.set({ ...p });
  }

  guardarBorrador() {
    const p = this.propiedad();
    if (!p) return;
    this.svc.actualizarOrdenFotos(p.id, p.imagenes);
    this.svc.actualizarPortada(p.id, p.fotoPortadaUrl);
    this.svc.actualizarTexto(p.id, this.textoEditado());
    this.router.navigate(['/']);
  }

  aprobarYPublicar() {
    const p = this.propiedad();
    if (!p) return;
    this.publicando.set(true);

    this.svc.actualizarOrdenFotos(p.id, p.imagenes);
    this.svc.actualizarPortada(p.id, p.fotoPortadaUrl);
    this.svc.actualizarTexto(p.id, this.textoEditado());

    // Simula la llamada a la Cloud Function `publicarPropiedad`
    // (Firestore Estado -> Venta/Renta + publicación en Facebook vía Graph API).
    setTimeout(() => {
      this.svc.aprobarYPublicar(p.id);
      this.publicando.set(false);
      this.publicado.set(true);
      setTimeout(() => this.router.navigate(['/']), 1400);
    }, 900);
  }
}
