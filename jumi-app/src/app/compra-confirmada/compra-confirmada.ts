import { Component, OnDestroy, OnInit, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { User } from 'firebase/auth';
import { PrecioCopPipe } from '../precio-cop-pipe';
import { Auth } from '../servicios/auth';
import { BaseDatos, codigoPedido, lineasDePedido } from '../servicios/base-datos';
import type { LineaPedido, Pedido } from '../servicios/base-datos';

type EstadoPedido = 'cargando' | 'listo' | 'no-encontrado' | 'error';

@Component({
  selector: 'app-compra-confirmada',
  imports: [RouterLink, PrecioCopPipe],
  templateUrl: './compra-confirmada.html',
  styleUrl: './compra-confirmada.scss'
})
export class CompraConfirmada implements OnInit, OnDestroy {
  private readonly auth = inject(Auth);
  private readonly baseDatos = inject(BaseDatos);

  readonly id = input<string>();
  readonly pedido = signal<Pedido | null>(null);
  readonly estado = signal<EstadoPedido>('cargando');
  readonly lineas = computed<LineaPedido[]>(() => {
    const pedido = this.pedido();
    if (pedido === null) {
      return [];
    }
    return lineasDePedido(pedido, this.baseDatos.productos());
  });
  readonly actualizado = computed(() => {
    const pedido = this.pedido();
    return pedido !== null && this.baseDatos.pedidoReflejado(pedido.id);
  });

  private solicitud = 0;

  constructor() {
    effect(() => {
      const id = this.id();
      const usuario = this.auth.usuario();
      untracked(() => {
        void this.cargar(id, usuario);
      });
    });
  }

  ngOnInit(): void {
    this.baseDatos.suscribirVentas();
  }

  ngOnDestroy(): void {
    this.baseDatos.liberarVentas();
  }

  codigo(id: string): string {
    return codigoPedido(id);
  }

  textoActualizacion(): string {
    if (this.actualizado()) {
      return 'Más vendidos actualizados';
    } else if (this.baseDatos.estadoVentas() === 'error') {
      return 'Sin conexión con Más vendidos. Se actualizará al reconectar.';
    }
    return 'Actualizando Más vendidos…';
  }

  obtenerClaseActualizacion(): string {
    if (this.actualizado()) {
      return 'actualizacion vigente';
    }
    return 'actualizacion';
  }

  reintentar(): void {
    void this.cargar(this.id(), this.auth.usuario());
  }

  private async cargar(id: string | undefined, usuario: User | null): Promise<void> {
    this.solicitud += 1;
    const solicitud = this.solicitud;
    this.pedido.set(null);
    if (usuario === null) {
      this.estado.set('cargando');
      return;
    }
    if (id === undefined || id === '') {
      this.estado.set('no-encontrado');
      return;
    }
    this.estado.set('cargando');
    try {
      const pedido = await this.baseDatos.leerPedido(usuario.uid, id);
      if (solicitud !== this.solicitud) {
        return;
      }
      if (pedido === null) {
        this.estado.set('no-encontrado');
      } else {
        this.pedido.set(pedido);
        this.estado.set('listo');
      }
    } catch {
      if (solicitud === this.solicitud) {
        this.estado.set('error');
      }
    }
  }
}
