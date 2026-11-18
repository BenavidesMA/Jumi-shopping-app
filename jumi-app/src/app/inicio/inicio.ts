import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BaseDatos } from '../servicios/base-datos';
import { EstadoTienda } from '../servicios/estado-tienda';
import { ESTRUCTURA_CATEGORIAS } from '../categorias-arbol-nario/categorias-arbol-nario';
import { MasVendidosHeap } from '../mas-vendidos-heap/mas-vendidos-heap';
import { VistosRecientementePila } from '../vistos-recientemente-pila/vistos-recientemente-pila';
import type { Producto } from '../tarjeta-producto/tarjeta-producto';

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, MasVendidosHeap, VistosRecientementePila],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})
export class Inicio implements OnInit, OnDestroy {
  protected readonly baseDatos = inject(BaseDatos);
  protected readonly estadoTienda = inject(EstadoTienda);
  protected readonly categorias = ESTRUCTURA_CATEGORIAS;

  ngOnInit(): void {
    this.baseDatos.suscribirVentas();
  }

  ngOnDestroy(): void {
    this.baseDatos.liberarVentas();
  }

  agregar(producto: Producto): void {
    this.estadoTienda.agregar(producto);
  }

  reintentar(): void {
    void this.baseDatos.cargarCatalogo();
  }
}