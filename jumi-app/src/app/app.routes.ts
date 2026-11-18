import { Routes } from '@angular/router';
import { Tienda } from './tienda/tienda';
import { authGuard } from './servicios/auth-guard';

export const routes: Routes = [
    { path: '', pathMatch: 'full', redirectTo: 'inicio' },
    {
        path: 'iniciar-sesion',
        loadComponent: () => import('./iniciar-sesion/iniciar-sesion').then((modulo) => modulo.IniciarSesion),
        title: 'Iniciar sesión · JUMI'
    },
    {
        path: 'crear-cuenta',
        loadComponent: () => import('./crear-cuenta/crear-cuenta').then((modulo) => modulo.CrearCuenta),
        title: 'Crear cuenta · JUMI'
    },
    {
        path: '',
        component: Tienda,
        children: [
            {
                path: 'inicio',
                loadComponent: () => import('./inicio/inicio').then((modulo) => modulo.Inicio),
                title: 'JUMI · Tecnología que va contigo'
            },
            {
                path: 'catalogo',
                loadComponent: () => import('./catalogo/catalogo').then((modulo) => modulo.Catalogo),
                title: 'Catálogo · JUMI'
            },
            {
                path: 'producto/:id',
                loadComponent: () => import('./detalle-producto/detalle-producto').then((modulo) => modulo.DetalleProducto),
                title: 'Producto · JUMI'
            },
            {
                path: 'carrito',
                loadComponent: () => import('./carrito/carrito').then((modulo) => modulo.Carrito),
                title: 'Carrito · JUMI'
            },
            {
                path: 'revisar-compra',
                canActivate: [authGuard],
                loadComponent: () => import('./revisar-compra/revisar-compra').then((modulo) => modulo.RevisarCompra),
                title: 'Revisar compra · JUMI'
            },
            {
                path: 'compra-confirmada/:id',
                canActivate: [authGuard],
                loadComponent: () => import('./compra-confirmada/compra-confirmada').then((modulo) => modulo.CompraConfirmada),
                title: 'Compra confirmada · JUMI'
            },
            {
                path: 'mis-compras',
                canActivate: [authGuard],
                loadComponent: () => import('./mis-compras/mis-compras').then((modulo) => modulo.MisCompras),
                title: 'Mis compras · JUMI'
            }
        ]
    },
    { path: '**', redirectTo: 'inicio' }
];