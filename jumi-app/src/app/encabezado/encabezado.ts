import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import type { Subscription } from 'rxjs';
import { Auth } from '../servicios/auth';
import { EstadoTienda } from '../servicios/estado-tienda';

@Component({
  selector: 'app-encabezado',
  imports: [FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './encabezado.html',
  styleUrl: './encabezado.scss',
  host: {
    '(document:click)': 'alHacerClic($event)',
    '(document:keydown.escape)': 'cerrarMenu()'
  }
})
export class Encabezado implements OnInit, OnDestroy {
  protected readonly auth = inject(Auth);
  protected readonly estadoTienda = inject(EstadoTienda);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly cambios = inject(ChangeDetectorRef);
  private suscripcion: Subscription | null = null;

  busqueda = '';
  readonly menuAbierto = signal(false);
  readonly saliendo = signal(false);

  ngOnInit(): void {
    this.suscripcion = this.ruta.queryParamMap.subscribe((parametros) => {
      const valor = parametros.get('buscar');
      this.busqueda = valor === null ? '' : valor;
      this.cambios.markForCheck();
    });
  }

  ngOnDestroy(): void {
    if (this.suscripcion !== null) {
      this.suscripcion.unsubscribe();
    }
  }

  buscar(): void {
    const texto = this.busqueda.trim();
    void this.router.navigate(['/catalogo'], {
      queryParams: { buscar: texto === '' ? null : texto },
      queryParamsHandling: 'merge'
    });
  }

  parametrosRetorno(): { volver: string } {
    return { volver: this.router.url };
  }

  alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  alHacerClic(evento: MouseEvent): void {
    if (!this.menuAbierto()) {
      return;
    }
    const objetivo = evento.target;
    if (objetivo instanceof Node && !this.elemento.nativeElement.contains(objetivo)) {
      this.menuAbierto.set(false);
    }
  }

  async cerrarSesion(): Promise<void> {
    this.saliendo.set(true);
    try {
      await this.auth.salir();
      this.menuAbierto.set(false);
      await this.router.navigate(['/iniciar-sesion']);
    } finally {
      this.saliendo.set(false);
    }
  }
}
