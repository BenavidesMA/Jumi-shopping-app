import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CarritoListaEnlazada } from '../carrito-lista-enlazada/carrito-lista-enlazada';
import type { CambioCantidad } from '../carrito-lista-enlazada/carrito-lista-enlazada';
import { PrecioCopPipe } from '../precio-cop-pipe';
import { Auth } from '../servicios/auth';
import { BaseDatos } from '../servicios/base-datos';
import { EstadoTienda } from '../servicios/estado-tienda';

@Component({
  selector: 'app-carrito',
  imports: [RouterLink, CarritoListaEnlazada, PrecioCopPipe],
  templateUrl: './carrito.html',
  styleUrl: './carrito.scss'
})
export class Carrito {
  protected readonly auth = inject(Auth);
  protected readonly baseDatos = inject(BaseDatos);
  protected readonly estadoTienda = inject(EstadoTienda);
  private readonly router = inject(Router);

  esVisitante(): boolean {
    return this.auth.resuelto() && this.auth.usuario() === null;
  }

  puedeFinalizar(): boolean {
    return this.auth.resuelto() && this.estadoTienda.listo() && this.estadoTienda.productosDistintos() > 0;
  }

  cambiarCantidad(cambio: CambioCantidad): void {
    this.estadoTienda.cambiarCantidad(cambio.id, cambio.cantidad);
  }

  eliminar(id: string): void {
    this.estadoTienda.eliminar(id);
  }

  finalizarCompra(): void {
    if (!this.puedeFinalizar()) {
      return;
    }
    if (this.auth.usuario() === null) {
      void this.router.navigate(['/iniciar-sesion'], { queryParams: { volver: '/revisar-compra' } });
    } else {
      void this.router.navigate(['/revisar-compra']);
    }
  }

  reintentar(): void {
    void this.baseDatos.cargarCatalogo();
  }
}
