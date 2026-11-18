import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Producto } from '../tarjeta-producto/tarjeta-producto';
import { PrecioCopPipe } from '../precio-cop-pipe';

export const MAXIMO_UNIDADES = 10;

export interface LineaCarrito {
  producto: Producto;
  cantidad: number;
}

export interface LineaVista {
  producto: Producto;
  cantidad: number;
  subtotal: number;
}

export interface CambioCantidad {
  id: string;
  cantidad: number;
}

export class Node {
  value: LineaCarrito;
  next: Node | null;

  constructor(value: LineaCarrito) {
    this.value = value;
    this.next = null;
  }
}

export class LinkedList {
  head: Node | null;
  tail: Node | null;
  length: number;

  constructor() {
    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  append(value: LineaCarrito): void {
    const newNode = new Node(value);
    if (!this.head) {
      this.head = newNode;
    } else if (this.tail !== null) {
      this.tail.next = newNode;
    }
    this.tail = newNode;
    this.length++;
  }

  peek(value: LineaCarrito, current: Node | null = this.head): Node | null {
    while (current) {
      if (current.value === value) {
        return current;
      }
      current = current.next;
    }
    return null;
  }

  size(): number {
    return this.length;
  }

  remove(value: LineaCarrito, current: Node | null = this.head): null | undefined {
    if (!this.head) return null;
    if (this.head.value === value) {
      this.head = this.head.next;
      if (!this.head) {
        this.tail = null;
      }
      this.length--;
      return undefined;
    }
    current = this.head;
    while (current.next && current.next.value !== value) {
      current = current.next;
    }
    if (current.next) {
      current.next = current.next.next;
      if (!current.next) this.tail = current;
      this.length--;
    }
    return undefined;
  }

  print(): void {
    let current = this.head;
    let result = '';
    while (current) {
      result += current.value.producto.nombre + ' x' + current.value.cantidad + ' -> ';
      current = current.next;
    }
    console.log(result + 'null');
  }

  buscarPorId(id: string): Node | null {
    let current = this.head;
    while (current) {
      if (current.value.producto.id === id) {
        return current;
      }
      current = current.next;
    }
    return null;
  }

  proyectar(): LineaVista[] {
    const lineas: LineaVista[] = [];
    let current = this.head;
    while (current) {
      lineas.push({
        producto: current.value.producto,
        cantidad: current.value.cantidad,
        subtotal: current.value.producto.precio * current.value.cantidad
      });
      current = current.next;
    }
    return lineas;
  }

  total(): number {
    let suma = 0;
    let current = this.head;
    while (current) {
      suma += current.value.producto.precio * current.value.cantidad;
      current = current.next;
    }
    return suma;
  }

  unidades(): number {
    let suma = 0;
    let current = this.head;
    while (current) {
      suma += current.value.cantidad;
      current = current.next;
    }
    return suma;
  }
}

@Component({
  selector: 'app-carrito-lista-enlazada',
  imports: [RouterLink, PrecioCopPipe],
  templateUrl: './carrito-lista-enlazada.html',
  styleUrl: './carrito-lista-enlazada.scss'
})
export class CarritoListaEnlazada {
  @Input({ required: true }) lineas: LineaVista[] = [];
  @Input() editable = true;
  @Output() cambiarCantidad = new EventEmitter<CambioCantidad>();
  @Output() eliminar = new EventEmitter<string>();

  readonly maximo = MAXIMO_UNIDADES;

  disminuir(linea: LineaVista): void {
    if (linea.cantidad > 1) {
      this.cambiarCantidad.emit({ id: linea.producto.id, cantidad: linea.cantidad - 1 });
    }
  }

  aumentar(linea: LineaVista): void {
    if (linea.cantidad < this.maximo) {
      this.cambiarCantidad.emit({ id: linea.producto.id, cantidad: linea.cantidad + 1 });
    }
  }

  alEliminar(linea: LineaVista): void {
    this.eliminar.emit(linea.producto.id);
  }
}
