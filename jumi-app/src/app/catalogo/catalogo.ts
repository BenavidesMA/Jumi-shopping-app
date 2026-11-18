import { Component, OnDestroy, OnInit, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BaseDatos } from '../servicios/base-datos';
import { EstadoTienda } from '../servicios/estado-tienda';
import { TarjetaProducto } from '../tarjeta-producto/tarjeta-producto';
import type { Producto } from '../tarjeta-producto/tarjeta-producto';
import {
  CategoriasArbolNario,
  ID_RAIZ,
  buscarNodo,
  construirArbol,
  dfs,
  rutaHasta
} from '../categorias-arbol-nario/categorias-arbol-nario';
import { MasVendidosHeap } from '../mas-vendidos-heap/mas-vendidos-heap';

function normalizar(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

@Component({
  selector: 'app-catalogo',
  imports: [RouterLink, TarjetaProducto, CategoriasArbolNario, MasVendidosHeap],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.scss'
})
export class Catalogo implements OnInit, OnDestroy {
  readonly categoria = input<string>();
  readonly buscar = input<string>();

  protected readonly baseDatos = inject(BaseDatos);
  private readonly estadoTienda = inject(EstadoTienda);
  private readonly router = inject(Router);

  protected readonly idRaiz = ID_RAIZ;

  protected readonly raiz = computed(() => construirArbol(this.baseDatos.productos()));

  protected readonly seleccionado = computed(() => {
    const id = this.categoria();
    if (id === undefined || id === '' || buscarNodo(this.raiz(), id) === null) {
      return ID_RAIZ;
    }
    return id;
  });

  protected readonly migas = computed(() => rutaHasta(this.raiz(), this.seleccionado()).slice(1));

  protected readonly titulo = computed(() => {
    const migas = this.migas();
    if (migas.length === 0) {
      return this.raiz().valor.titulo;
    } else if (migas.length === 1) {
      return migas[0].valor.titulo;
    }
    return migas[0].valor.titulo + ' · ' + migas[1].valor.titulo;
  });

  protected readonly productosCategoria = computed(() => {
    const nodo = buscarNodo(this.raiz(), this.seleccionado());
    return dfs(nodo === null ? this.raiz() : nodo);
  });

  protected readonly textoBusqueda = computed(() => {
    const valor = this.buscar();
    return valor === undefined ? '' : valor.trim();
  });

  protected readonly resultados = computed(() => {
    const termino = normalizar(this.textoBusqueda());
    const filtrados = this.productosCategoria().filter((producto) => normalizar(producto.nombre).includes(termino));
    return filtrados.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  });

  ngOnInit(): void {
    this.baseDatos.suscribirVentas();
  }

  ngOnDestroy(): void {
    this.baseDatos.liberarVentas();
  }

  seleccionar(id: string): void {
    void this.router.navigate(['/catalogo'], {
      queryParams: { categoria: id === ID_RAIZ ? null : id },
      queryParamsHandling: 'merge'
    });
  }

  limpiarBusqueda(): void {
    void this.router.navigate(['/catalogo'], {
      queryParams: { buscar: null },
      queryParamsHandling: 'merge'
    });
  }

  textoCantidad(): string {
    const cantidad = this.resultados().length;
    if (cantidad === 1) {
      return '1 producto';
    }
    return cantidad + ' productos';
  }

  textoSinResultados(): string {
    if (this.textoBusqueda() !== '') {
      return 'No encontramos productos con «' + this.textoBusqueda() + '» en ' + this.titulo() + '.';
    }
    return 'Esta categoría todavía no tiene productos.';
  }

  agregar(producto: Producto): void {
    this.estadoTienda.agregar(producto);
  }

  reintentar(): void {
    void this.baseDatos.cargarCatalogo();
  }
}