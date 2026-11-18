import { Component, OnChanges, SimpleChanges, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { BaseDatos } from '../servicios/base-datos';
import { EstadoTienda } from '../servicios/estado-tienda';
import { PrecioCopPipe } from '../precio-cop-pipe';
import { ProductosRelacionadosGrafo } from '../productos-relacionados-grafo/productos-relacionados-grafo';
import { VistosRecientementePila } from '../vistos-recientemente-pila/vistos-recientemente-pila';
import type { Producto } from '../tarjeta-producto/tarjeta-producto';

@Component({
  selector: 'app-detalle-producto',
  imports: [RouterLink, PrecioCopPipe, ProductosRelacionadosGrafo, VistosRecientementePila],
  templateUrl: './detalle-producto.html',
  styleUrl: './detalle-producto.scss'
})
export class DetalleProducto implements OnChanges {
  readonly id = input<string>();

  protected readonly baseDatos = inject(BaseDatos);
  protected readonly estadoTienda = inject(EstadoTienda);
  private readonly titulo = inject(Title);

  private readonly aperturaPendiente = signal(false);
  private aperturas = 0;

  protected readonly producto = computed(() => {
    const id = this.id();
    if (id === undefined) {
      return null;
    }
    const encontrado = this.baseDatos.productos().find((item) => item.id === id);
    return encontrado === undefined ? null : encontrado;
  });

  constructor() {
    effect(() => {
      const pendiente = this.aperturaPendiente();
      const listo = this.estadoTienda.listo();
      const producto = this.producto();
      if (!pendiente || !listo || producto === null) {
        return;
      }
      untracked(() => this.registrarApertura(producto));
    });
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['id'] !== undefined) {
      this.aperturaPendiente.set(true);
    }
  }

  agregar(producto: Producto): void {
    this.estadoTienda.agregar(producto);
  }

  textoDisponibilidad(producto: Producto): string {
    if (producto.disponible) {
      return 'Disponible';
    }
    return 'No disponible';
  }

  obtenerClaseDisponibilidad(producto: Producto): string {
    if (producto.disponible) {
      return 'disponibilidad';
    }
    return 'disponibilidad agotado';
  }

  reintentar(): void {
    void this.baseDatos.cargarCatalogo();
  }

  private registrarApertura(producto: Producto): void {
    this.aperturas += 1;
    this.aperturaPendiente.set(false);
    this.estadoTienda.registrarVisita(producto, producto.id + '-' + Date.now() + '-' + this.aperturas);
    this.titulo.setTitle(producto.nombre + ' · JUMI');
  }
}