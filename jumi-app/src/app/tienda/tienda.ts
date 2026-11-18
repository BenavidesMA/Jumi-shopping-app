import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Encabezado } from '../encabezado/encabezado';
import { PiePagina } from '../pie-pagina/pie-pagina';

@Component({
  selector: 'app-tienda',
  imports: [RouterOutlet, Encabezado, PiePagina],
  templateUrl: './tienda.html',
  styleUrl: './tienda.scss'
})
export class Tienda {}
