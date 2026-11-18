import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CarritoListaEnlazada } from '../carrito-lista-enlazada/carrito-lista-enlazada';
import { PrecioCopPipe } from '../precio-cop-pipe';
import { BaseDatos, mensajeErrorCompra } from '../servicios/base-datos';
import { EstadoTienda } from '../servicios/estado-tienda';

@Component({
  selector: 'app-revisar-compra',
  imports: [RouterLink, CarritoListaEnlazada, PrecioCopPipe],
  templateUrl: './revisar-compra.html',
  styleUrl: './revisar-compra.scss'
})
export class RevisarCompra {
  protected readonly baseDatos = inject(BaseDatos);
  protected readonly estadoTienda = inject(EstadoTienda);
  private readonly router = inject(Router);

  readonly procesando = signal(false);
  readonly msg = signal('');

  puedeConfirmar(): boolean {
    return this.estadoTienda.listo() && this.estadoTienda.productosDistintos() > 0 && !this.procesando();
  }

  async confirmar(): Promise<void> {
    if (!this.puedeConfirmar()) {
      return;
    }
    this.msg.set('');
    this.procesando.set(true);
    try {
      const pedidoId = await this.estadoTienda.confirmarCompra();
      await this.router.navigate(['/compra-confirmada', pedidoId]);
    } catch (error) {
      this.msg.set(mensajeErrorCompra(error));
    } finally {
      this.procesando.set(false);
    }
  }

  reintentarCatalogo(): void {
    void this.baseDatos.cargarCatalogo();
  }
}
