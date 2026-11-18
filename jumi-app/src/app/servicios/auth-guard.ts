import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { CanActivateFn, UrlTree } from '@angular/router';
import { Auth } from './auth';

const RUTAS_RETORNO = new Map<string, number>([
  ['inicio', 1],
  ['catalogo', 1],
  ['carrito', 1],
  ['revisar-compra', 1],
  ['mis-compras', 1],
  ['producto', 2],
  ['compra-confirmada', 2]
]);

const PARAMETROS_CATALOGO = ['categoria', 'buscar'];

export function destinoSeguro(router: Router, volver: string | undefined): UrlTree {
  const inicio = router.createUrlTree(['/inicio']);
  if (volver === undefined || !volver.startsWith('/') || volver.startsWith('//') || volver.includes('\\')) {
    return inicio;
  }
  let arbol: UrlTree;
  try {
    arbol = router.parseUrl(volver);
  } catch {
    return inicio;
  }
  const salidas = Object.keys(arbol.root.children);
  if (salidas.length !== 1 || salidas[0] !== 'primary') {
    return inicio;
  }
  const segmentos = arbol.root.children['primary'].segments.map((segmento) => segmento.path);
  const esperados = RUTAS_RETORNO.get(segmentos[0]);
  if (esperados === undefined || segmentos.length !== esperados) {
    return inicio;
  }
  const parametros: Record<string, string> = {};
  if (segmentos[0] === 'catalogo') {
    for (const nombre of PARAMETROS_CATALOGO) {
      const valor = arbol.queryParamMap.get(nombre);
      if (valor !== null) {
        parametros[nombre] = valor;
      }
    }
  }
  return router.createUrlTree(['/', ...segmentos], { queryParams: parametros });
}

export const authGuard: CanActivateFn = async (_ruta, estado) => {
  const auth = inject(Auth);
  const router = inject(Router);
  await auth.esperarEstadoInicial();
  if (auth.usuarioActual() !== null) {
    return true;
  }
  return router.createUrlTree(['/iniciar-sesion'], { queryParams: { volver: estado.url } });
};