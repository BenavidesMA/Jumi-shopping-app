import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Producto } from '../tarjeta-producto/tarjeta-producto';
import { PrecioCopPipe } from '../precio-cop-pipe';

export const VISITAS_VISIBLES = 6;

export interface VisitaProducto {
  clave: string;
  producto: Producto;
}

export class Stack<T> {
  items: T[];

  constructor() {
    this.items = [];
  }

  push(value: T): void {
    this.items.push(value);
  }

  pop(): T | null {
    const value = this.items.pop();
    return value !== undefined ? value : null;
  }

  peek(): T | null {
    return this.items.length > 0 ? this.items[this.items.length - 1] : null;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }

  print(): void {
    this.items.slice().reverse().forEach(item => {
      console.log(item);
    });
  }

  recientes(limite: number): T[] {
    const resultado: T[] = [];
    for (let i = this.items.length - 1; i >= 0 && resultado.length < limite; i--) {
      resultado.push(this.items[i]);
    }
    return resultado;
  }
}

@Component({
  selector: 'app-vistos-recientemente-pila',
  imports: [RouterLink, PrecioCopPipe],
  templateUrl: './vistos-recientemente-pila.html',
  styleUrl: './vistos-recientemente-pila.scss'
})
export class VistosRecientementePila {
  @Input({ required: true }) visitas: VisitaProducto[] = [];
  @Input() ultima: VisitaProducto | null = null;
  @Input() compacto = false;

  textoSubtitulo(): string {
    if (this.ultima !== null) {
      return 'Tu última visita, a un clic.';
    }
    return 'Los productos que abras aparecerán aquí.';
  }

  obtenerClaseLista(): string {
    if (this.compacto) {
      return 'lista compacta';
    }
    return 'lista';
  }
}
