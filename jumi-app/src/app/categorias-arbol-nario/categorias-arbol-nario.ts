import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import type { Producto } from '../tarjeta-producto/tarjeta-producto';

export const ID_RAIZ = 'todos';

export interface Categoria {
  id: string;
  titulo: string;
  productos: Producto[];
}

export interface DefinicionSubcategoria {
  id: string;
  titulo: string;
}

export interface DefinicionCategoria {
  id: string;
  titulo: string;
  imagen: string;
  subcategorias: DefinicionSubcategoria[];
}

export const ESTRUCTURA_CATEGORIAS: DefinicionCategoria[] = [
  {
    id: 'teclados',
    titulo: 'Teclados',
    imagen: 'img/TecladoMecanico.png',
    subcategorias: [
      { id: 'teclados-mecanicos', titulo: 'Mecánicos' },
      { id: 'teclados-de-membrana', titulo: 'De membrana' }
    ]
  },
  {
    id: 'mouses',
    titulo: 'Mouses',
    imagen: 'img/MouseSinCable.png',
    subcategorias: [
      { id: 'mouses-alambricos', titulo: 'Alámbricos' },
      { id: 'mouses-inalambricos', titulo: 'Inalámbricos' }
    ]
  },
  {
    id: 'audifonos',
    titulo: 'Audífonos',
    imagen: 'img/AudifonosSinCable.png',
    subcategorias: [
      { id: 'audifonos-con-cable', titulo: 'Con cable' },
      { id: 'audifonos-inalambricos', titulo: 'Inalámbricos' }
    ]
  },
  {
    id: 'monitores',
    titulo: 'Monitores',
    imagen: 'img/Monitor.png',
    subcategorias: [
      { id: 'monitores-full-hd', titulo: 'Full HD' },
      { id: 'monitores-qhd', titulo: 'QHD' },
      { id: 'monitores-4k', titulo: '4K' }
    ]
  }
];

export class Nodo {
  valor: Categoria;
  hijos: Nodo[];

  constructor(valor: Categoria) {
    this.valor = valor;
    this.hijos = [];
  }

  agregarHijo(nodo: Nodo): void {
    this.hijos.push(nodo);
  }
}

export function dfs(nodo: Nodo, acumulador: Producto[] = []): Producto[] {
  for (const producto of nodo.valor.productos) {
    acumulador.push(producto);
  }
  for (let hijo of nodo.hijos) {
    dfs(hijo, acumulador);
  }
  return acumulador;
}

export function buscarNodo(nodo: Nodo, id: string): Nodo | null {
  if (nodo.valor.id === id) {
    return nodo;
  }
  for (let hijo of nodo.hijos) {
    const encontrado = buscarNodo(hijo, id);
    if (encontrado !== null) {
      return encontrado;
    }
  }
  return null;
}

export function rutaHasta(nodo: Nodo, id: string, ruta: Nodo[] = []): Nodo[] {
  const actual = [...ruta, nodo];
  if (nodo.valor.id === id) {
    return actual;
  }
  for (let hijo of nodo.hijos) {
    const encontrada = rutaHasta(hijo, id, actual);
    if (encontrada.length > 0) {
      return encontrada;
    }
  }
  return [];
}

export function construirArbol(productos: Producto[]): Nodo {
  const raiz = new Nodo({ id: ID_RAIZ, titulo: 'Todos los productos', productos: [] });
  for (const categoria of ESTRUCTURA_CATEGORIAS) {
    const nodoCategoria = new Nodo({ id: categoria.id, titulo: categoria.titulo, productos: [] });
    for (const subcategoria of categoria.subcategorias) {
      const propios = productos.filter((producto) => producto.subcategoriaId === subcategoria.id);
      nodoCategoria.agregarHijo(new Nodo({ id: subcategoria.id, titulo: subcategoria.titulo, productos: propios }));
    }
    raiz.agregarHijo(nodoCategoria);
  }
  return raiz;
}

@Component({
  selector: 'app-categorias-arbol-nario',
  imports: [],
  templateUrl: './categorias-arbol-nario.html',
  styleUrl: './categorias-arbol-nario.scss'
})
export class CategoriasArbolNario {
  @Input({ required: true }) raiz: Nodo | null = null;
  @Input() seleccionado = ID_RAIZ;
  @Output() seleccionar = new EventEmitter<string>();

  readonly colapsadas = signal<string[]>([]);

  elegir(id: string): void {
    this.seleccionar.emit(id);
  }

  alternar(id: string): void {
    const actuales = this.colapsadas();
    if (actuales.includes(id)) {
      this.colapsadas.set(actuales.filter((valor) => valor !== id));
    } else {
      this.colapsadas.set([...actuales, id]);
    }
  }

  estaExpandida(id: string): boolean {
    return !this.colapsadas().includes(id);
  }

  etiquetaAlternar(nodo: Nodo): string {
    if (this.estaExpandida(nodo.valor.id)) {
      return 'Contraer ' + nodo.valor.titulo;
    }
    return 'Expandir ' + nodo.valor.titulo;
  }

  obtenerClase(id: string, nivel: string): string {
    if (id === this.seleccionado) {
      return 'opcion ' + nivel + ' activa';
    }
    return 'opcion ' + nivel;
  }
}
