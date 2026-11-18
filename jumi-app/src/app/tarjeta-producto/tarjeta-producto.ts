import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PrecioCopPipe } from '../precio-cop-pipe';

export interface Especificacion {
  nombre: string;
  valor: string;
}

export interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  categoriaId: string;
  subcategoria: string;
  subcategoriaId: string;
  descripcion: string;
  precio: number;
  imagen: string;
  disponible: boolean;
  especificaciones: Especificacion[];
  popularidad: number;
}

@Component({
  selector: 'app-tarjeta-producto',
  imports: [RouterLink, PrecioCopPipe],
  templateUrl: './tarjeta-producto.html',
  styleUrl: './tarjeta-producto.scss'
})
export class TarjetaProducto {
  @Input({ required: true }) producto: Producto | null = null;
  @Input() posicion = 0;
  @Output() agregar = new EventEmitter<Producto>();

  textoPosicion(): string {
    if (this.posicion < 10) {
      return '0' + this.posicion;
    }
    return String(this.posicion);
  }

  alAgregar(producto: Producto): void {
    this.agregar.emit(producto);
  }
}
