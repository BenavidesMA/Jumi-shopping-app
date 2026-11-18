import { Component, OnDestroy, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Unsubscribe } from 'firebase/firestore';
import { PrecioCopPipe } from '../precio-cop-pipe';
import { Auth } from '../servicios/auth';
import { BaseDatos, codigoPedido, lineasDePedido } from '../servicios/base-datos';
import type { LineaPedido, Pedido } from '../servicios/base-datos';

type EstadoCompras = 'cargando' | 'listo' | 'error';

const formatoFecha = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short' });

@Component({
  selector: 'app-mis-compras',
  imports: [RouterLink, PrecioCopPipe],
  templateUrl: './mis-compras.html',
  styleUrl: './mis-compras.scss'
})
export class MisCompras implements OnDestroy {
  private readonly auth = inject(Auth);
  private readonly baseDatos = inject(BaseDatos);

  readonly pedidos = signal<Pedido[]>([]);
  readonly estado = signal<EstadoCompras>('cargando');

  private uidActual: string | null = null;
  private cancelar: Unsubscribe | null = null;

  constructor() {
    effect(() => {
      const usuario = this.auth.usuario();
      const uid = usuario === null ? null : usuario.uid;
      untracked(() => this.escuchar(uid));
    });
  }

  ngOnDestroy(): void {
    this.detener();
  }

  reintentar(): void {
    this.escuchar(this.uidActual);
  }

  lineas(pedido: Pedido): LineaPedido[] {
    return lineasDePedido(pedido, this.baseDatos.productos());
  }

  codigo(id: string): string {
    return codigoPedido(id);
  }

  fecha(pedido: Pedido): string {
    if (pedido.fecha === null) {
      return 'Fecha en proceso';
    }
    return formatoFecha.format(pedido.fecha);
  }

  textoCantidad(): string {
    const cantidad = this.pedidos().length;
    if (cantidad === 1) {
      return '1 pedido confirmado';
    }
    return cantidad + ' pedidos confirmados';
  }

  private escuchar(uid: string | null): void {
    if (uid === this.uidActual && this.cancelar !== null) {
      return;
    }
    this.detener();
    this.uidActual = uid;
    this.pedidos.set([]);
    this.estado.set('cargando');
    if (uid === null) {
      return;
    }
    this.cancelar = this.baseDatos.escucharPedidos(
      uid,
      (pedidos) => {
        if (this.uidActual === uid) {
          this.pedidos.set(pedidos);
          this.estado.set('listo');
        }
      },
      () => {
        if (this.uidActual === uid) {
          this.cancelar = null;
          this.estado.set('error');
        }
      }
    );
  }

  private detener(): void {
    if (this.cancelar !== null) {
      this.cancelar();
      this.cancelar = null;
    }
  }
}
