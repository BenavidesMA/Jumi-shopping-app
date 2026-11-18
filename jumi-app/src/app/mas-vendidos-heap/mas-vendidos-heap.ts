import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { TarjetaProducto } from '../tarjeta-producto/tarjeta-producto';
import type { Producto } from '../tarjeta-producto/tarjeta-producto';

export const CANTIDAD_MAS_VENDIDOS = 4;

export type EstadoVivo = 'conectando' | 'en-vivo' | 'reconectando' | 'error';

export interface EntradaHeap {
  producto: Producto;
  prioridad: number;
}

export class MinHeap {
  heap: EntradaHeap[];

  constructor(initial: EntradaHeap[] = []) {
    this.heap = [];

    if (initial.length > 0) {
      this.heap = [...initial];
      this.heapify();
    }
  }

  push(value: EntradaHeap): void {
    this.heap.push(value);
    this.percolateUp();
  }

  pop(): EntradaHeap | undefined {
    if (this.heap.length === 0) return undefined;
    const n = this.heap.length;
    this.swap(0, n - 1);
    const min = this.heap.pop();
    this.percolateDown(0);
    return min;
  }

  peek(): EntradaHeap | undefined {
    return this.heap.length > 0 ? this.heap[0] : undefined;
  }

  heapify(): void {
    const start = Math.floor((this.heap.length - 2) / 2);
    for (let i = start; i >= 0; i--) {
      this.percolateDown(i);
    }
  }

  percolateDown(index: number): void {
    let curr = index;
    while (2 * curr + 1 < this.heap.length) {
      const left = 2 * curr + 1;
      const right = 2 * curr + 2;
      const minChild = right < this.heap.length && this.esMenor(this.heap[right], this.heap[left]) ? right : left;
      if (this.esMenor(this.heap[minChild], this.heap[curr])) {
        this.swap(curr, minChild);
        curr = minChild;
      } else {
        break;
      }
    }
  }

  percolateUp(): void {
    let curr = this.heap.length - 1;
    while (curr > 0) {
      const parent = Math.floor((curr - 1) / 2);
      if (this.esMenor(this.heap[curr], this.heap[parent])) {
        this.swap(curr, parent);
        curr = parent;
      } else {
        break;
      }
    }
  }

  swap(i: number, j: number): void {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  size(): number {
    return this.heap.length;
  }

  toArray(): EntradaHeap[] {
    return [...this.heap];
  }

  esMenor(a: EntradaHeap, b: EntradaHeap): boolean {
    if (a.prioridad !== b.prioridad) {
      return a.prioridad < b.prioridad;
    }
    return a.producto.id < b.producto.id;
  }
}

export function masVendidos(productos: Producto[], cantidad: number): Producto[] {
  const entradas = productos.map((producto) => ({ producto, prioridad: -producto.popularidad }));
  const heap = new MinHeap(entradas);
  const resultado: Producto[] = [];
  while (resultado.length < cantidad && heap.size() > 0) {
    const entrada = heap.pop();
    if (entrada !== undefined) {
      resultado.push(entrada.producto);
    }
  }
  return resultado;
}

@Component({
  selector: 'app-mas-vendidos-heap',
  imports: [TarjetaProducto],
  templateUrl: './mas-vendidos-heap.html',
  styleUrl: './mas-vendidos-heap.scss'
})
export class MasVendidosHeap implements OnChanges {
  @Input({ required: true }) productos: Producto[] = [];
  @Input() estado: EstadoVivo = 'conectando';
  @Input() titulo = 'Más vendidos';
  @Input() subtitulo = '';
  @Input() compacto = false;
  @Output() agregar = new EventEmitter<Producto>();

  readonly ranking = signal<Producto[]>([]);

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['productos'] !== undefined) {
      this.ranking.set(masVendidos(this.productos, CANTIDAD_MAS_VENDIDOS));
    }
  }

  textoEstado(): string {
    if (this.estado === 'en-vivo') {
      return 'En vivo';
    } else if (this.estado === 'reconectando') {
      return 'Reconectando';
    } else if (this.estado === 'error') {
      return 'Sin conexión';
    }
    return 'Conectando';
  }

  obtenerClaseEstado(): string {
    return 'estado ' + this.estado;
  }

  obtenerClaseCuadricula(): string {
    if (this.compacto) {
      return 'cuadricula compacta';
    }
    return 'cuadricula';
  }

  alAgregar(producto: Producto): void {
    this.agregar.emit(producto);
  }
}
