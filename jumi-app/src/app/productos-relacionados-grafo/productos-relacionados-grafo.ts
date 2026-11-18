import { Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { TarjetaProducto } from '../tarjeta-producto/tarjeta-producto';
import type { Producto } from '../tarjeta-producto/tarjeta-producto';

export const MAXIMO_RELACIONADOS = 3;

export interface NodoProducto {
  nombre: string;
  id: string;
}

export interface Arista {
  origen: string;
  destino: string;
}

export class Graph {
  nodes: NodoProducto[];
  adjList: Record<string, string[]>;

  constructor() {
    this.nodes = [];
    this.adjList = {};
  }

  addNode(node: NodoProducto): void {
    if (!this.searchNode(node.nombre)) {
      this.nodes.push(node);
      this.adjList[node.nombre] = [];
    }
  }

  addEdge(node1: string, node2: string): void {
    this.adjList[node1].push(node2);
    this.adjList[node2].push(node1);
  }

  searchNode(node: string): NodoProducto | undefined {
    if (!this.nodes.length) return undefined;
    return this.nodes.find(n => n.nombre == node);
  }

  printAdjacency(node: string): void {
    if (this.searchNode(node)) {
      console.log(this.adjList[node]);
    }
  }

  isEmpty(): boolean {
    if (this.nodes.length === 0) {
      return true;
    } else {
      return false;
    }
  }

  printGraph(): void {
    console.log(this.adjList);
  }

  vecinos(node: string): string[] {
    if (this.searchNode(node)) {
      return [...this.adjList[node]];
    }
    return [];
  }
}

function buscarNodoPorId(grafo: Graph, id: string): NodoProducto | undefined {
  return grafo.nodes.find((nodo) => nodo.id === id);
}

export function construirGrafo(productos: Producto[], aristas: Arista[]): Graph {
  const grafo = new Graph();
  for (const producto of productos) {
    grafo.addNode({ nombre: producto.nombre, id: producto.id });
  }
  for (const arista of aristas) {
    const origen = buscarNodoPorId(grafo, arista.origen);
    const destino = buscarNodoPorId(grafo, arista.destino);
    if (origen === undefined || destino === undefined) {
      continue;
    }
    if (origen.nombre === destino.nombre) {
      continue;
    }
    if (grafo.vecinos(origen.nombre).includes(destino.nombre)) {
      continue;
    }
    grafo.addEdge(origen.nombre, destino.nombre);
  }
  return grafo;
}

export function obtenerRelacionados(grafo: Graph, producto: Producto, catalogo: Producto[], limite: number): Producto[] {
  const relacionados: Producto[] = [];
  for (const nombre of grafo.vecinos(producto.nombre)) {
    if (relacionados.length >= limite) {
      break;
    }
    const nodo = grafo.searchNode(nombre);
    if (nodo === undefined) {
      continue;
    }
    const encontrado = catalogo.find((item) => item.id === nodo.id);
    if (encontrado !== undefined) {
      relacionados.push(encontrado);
    }
  }
  return relacionados;
}

@Component({
  selector: 'app-productos-relacionados-grafo',
  imports: [TarjetaProducto],
  templateUrl: './productos-relacionados-grafo.html',
  styleUrl: './productos-relacionados-grafo.scss'
})
export class ProductosRelacionadosGrafo implements OnChanges {
  @Input({ required: true }) grafo: Graph | null = null;
  @Input({ required: true }) producto: Producto | null = null;
  @Input({ required: true }) catalogo: Producto[] = [];
  @Output() agregar = new EventEmitter<Producto>();

  readonly relacionados = signal<Producto[]>([]);

  ngOnChanges(): void {
    if (this.grafo === null || this.producto === null) {
      this.relacionados.set([]);
      return;
    }
    this.relacionados.set(obtenerRelacionados(this.grafo, this.producto, this.catalogo, MAXIMO_RELACIONADOS));
  }

  alAgregar(producto: Producto): void {
    this.agregar.emit(producto);
  }
}
