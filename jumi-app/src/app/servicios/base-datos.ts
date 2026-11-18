import { Injectable, OnDestroy, signal } from '@angular/core';
import { FirebaseError } from 'firebase/app';
import {
    Timestamp,
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    runTransaction,
    serverTimestamp
} from 'firebase/firestore';
import type { DocumentData, Unsubscribe } from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { Especificacion, Producto } from '../tarjeta-producto/tarjeta-producto';
import { construirGrafo } from '../productos-relacionados-grafo/productos-relacionados-grafo';
import type { Arista, Graph } from '../productos-relacionados-grafo/productos-relacionados-grafo';
import type { EstadoVivo } from '../mas-vendidos-heap/mas-vendidos-heap';
import { MAXIMO_UNIDADES } from '../carrito-lista-enlazada/carrito-lista-enlazada';

export type EstadoCarga = 'cargando' | 'listo' | 'error';

export interface Pedido {
    id: string;
    uid: string;
    cantidades: Record<string, number>;
    precios: Record<string, number>;
    total: number;
    fecha: Date | null;
}

export interface LineaPedido {
    id: string;
    nombre: string;
    cantidad: number;
    precio: number;
    subtotal: number;
}

export interface ResultadoCompra {
    estado: 'creado' | 'existente';
    unidadesEsperadas: Record<string, number>;
}

export class ErrorCompra extends Error { }

const ESPERA_REINTENTO_MS = 5000;
const FORMATO_ID_PEDIDO = /^[A-Za-z0-9_-]{1,64}$/;

function texto(valor: unknown): string {
    return typeof valor === 'string' ? valor : '';
}

function numero(valor: unknown): number {
    return typeof valor === 'number' && Number.isFinite(valor) ? valor : 0;
}

function convertirEspecificaciones(valor: unknown): Especificacion[] {
    const especificaciones: Especificacion[] = [];
    if (!Array.isArray(valor)) {
        return especificaciones;
    }
    for (const item of valor) {
        if (typeof item === 'object' && item !== null) {
            especificaciones.push({ nombre: texto(item['nombre']), valor: texto(item['valor']) });
        }
    }
    return especificaciones;
}

function convertirProducto(id: string, datos: DocumentData): Producto {
    return {
        id,
        nombre: texto(datos['nombre']),
        categoria: texto(datos['categoria']),
        categoriaId: texto(datos['categoriaId']),
        subcategoria: texto(datos['subcategoria']),
        subcategoriaId: texto(datos['subcategoriaId']),
        descripcion: texto(datos['descripcion']),
        precio: numero(datos['precio']),
        imagen: texto(datos['imagen']),
        disponible: datos['disponible'] === true,
        especificaciones: convertirEspecificaciones(datos['especificaciones']),
        popularidad: 0
    };
}

function convertirAristas(valor: unknown): Arista[] {
    const aristas: Arista[] = [];
    if (!Array.isArray(valor)) {
        return aristas;
    }
    for (const item of valor) {
        if (typeof item === 'object' && item !== null) {
            aristas.push({ origen: texto(item['origen']), destino: texto(item['destino']) });
        }
    }
    return aristas;
}

function convertirUnidades(valor: unknown): Record<string, number> {
    const unidades: Record<string, number> = {};
    if (typeof valor !== 'object' || valor === null) {
        return unidades;
    }
    for (const [id, cantidad] of Object.entries(valor)) {
        unidades[id] = numero(cantidad);
    }
    return unidades;
}

function convertirPedido(id: string, datos: DocumentData): Pedido {
    const fecha = datos['fecha'];
    return {
        id,
        uid: texto(datos['uid']),
        cantidades: convertirUnidades(datos['cantidades']),
        precios: convertirUnidades(datos['precios']),
        total: numero(datos['total']),
        fecha: fecha instanceof Timestamp ? fecha.toDate() : null
    };
}

export function codigoPedido(id: string): string {
    return 'JUMI-' + id.slice(0, 6).toUpperCase();
}

export function lineasDePedido(pedido: Pedido, catalogo: Producto[]): LineaPedido[] {
    const lineas: LineaPedido[] = [];
    for (const [id, cantidad] of Object.entries(pedido.cantidades)) {
        if (cantidad <= 0) {
            continue;
        }
        const producto = catalogo.find((candidato) => candidato.id === id);
        const precio = Object.hasOwn(pedido.precios, id) ? pedido.precios[id] : 0;
        lineas.push({
            id,
            nombre: producto === undefined ? id : producto.nombre,
            cantidad,
            precio,
            subtotal: precio * cantidad
        });
    }
    return lineas;
}

export function mensajeErrorCompra(error: unknown): string {
    if (error instanceof ErrorCompra) {
        return error.message;
    }
    let codigo = '';
    if (error instanceof FirebaseError) {
        codigo = error.code;
    }
    if (codigo === 'permission-denied') {
        return 'No pudimos validar tu compra con los precios de la tienda. Revisa tu carrito e inténtalo de nuevo.';
    } else if (codigo === 'unavailable' || codigo === 'deadline-exceeded') {
        return 'No hay conexión con el servidor. Tu carrito se conserva; inténtalo de nuevo.';
    } else if (codigo === 'aborted') {
        return 'Hubo muchas compras al mismo tiempo. Inténtalo de nuevo.';
    } else if (codigo === 'unauthenticated') {
        return 'Tu sesión expiró. Inicia sesión de nuevo para finalizar.';
    }
    return 'No pudimos confirmar tu compra. Tu carrito se conserva; inténtalo de nuevo.';
}

@Injectable({ providedIn: 'root' })
export class BaseDatos implements OnDestroy {
    readonly productos = signal<Producto[]>([]);
    readonly estadoCatalogo = signal<EstadoCarga>('cargando');
    readonly errorCatalogo = signal('');
    readonly grafo = signal<Graph | null>(null);
    readonly estadoVentas = signal<EstadoVivo>('conectando');
    readonly unidadesVendidas = signal<Record<string, number>>({});

    private catalogoBase: Producto[] = [];
    private cargaEnCurso: Promise<void> | null = null;
    private cancelarVentas: Unsubscribe | null = null;
    private suscriptoresVentas = 0;
    private ventasRecibidas = false;
    private temporizadorReintento: ReturnType<typeof setTimeout> | null = null;
    private readonly ventasEsperadas = new Map<string, Record<string, number>>();

    cargarCatalogo(): Promise<void> {
        if (this.cargaEnCurso === null) {
            this.cargaEnCurso = this.leerCatalogo();
        }
        return this.cargaEnCurso;
    }

    suscribirVentas(): void {
        this.suscriptoresVentas += 1;
        if (this.suscriptoresVentas === 1) {
            this.iniciarEscuchaVentas();
        }
    }

    liberarVentas(): void {
        if (this.suscriptoresVentas > 0) {
            this.suscriptoresVentas -= 1;
        }
        if (this.suscriptoresVentas === 0) {
            this.detenerEscuchaVentas();
        }
    }

    nuevoIdPedido(uid: string): string {
        return doc(collection(db, 'usuarios', uid, 'pedidos')).id;
    }

    async confirmarPedido(uid: string, pedidoId: string, cantidades: Record<string, number>): Promise<ResultadoCompra> {
        const pedidoRef = doc(db, 'usuarios', uid, 'pedidos', pedidoId);
        const preciosRef = doc(db, 'catalogos', 'precios');
        const ventasRef = doc(db, 'estadisticas', 'ventas');
        const resultado = await runTransaction<ResultadoCompra>(db, async (transaccion) => {
            const pedido = await transaccion.get(pedidoRef);
            if (pedido.exists()) {
                return { estado: 'existente', unidadesEsperadas: {} };
            }
            const datosPrecios = (await transaccion.get(preciosRef)).data();
            const datosVentas = (await transaccion.get(ventasRef)).data();
            if (datosPrecios === undefined || datosVentas === undefined) {
                throw new ErrorCompra('Los precios de la tienda no están disponibles. Inténtalo más tarde.');
            }
            const precios = convertirUnidades(datosPrecios['precios']);
            const vendidas = convertirUnidades(datosVentas['unidades']);
            for (const [id, cantidad] of Object.entries(cantidades)) {
                if (!Object.hasOwn(precios, id)) {
                    throw new ErrorCompra('Uno de los productos del carrito ya no está disponible.');
                }
                if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAXIMO_UNIDADES) {
                    throw new ErrorCompra('Revisa las cantidades del carrito.');
                }
            }
            const cantidadesPedido: Record<string, number> = {};
            const unidadesNuevas: Record<string, number> = {};
            const unidadesEsperadas: Record<string, number> = {};
            let total = 0;
            for (const [id, precio] of Object.entries(precios)) {
                const cantidad = Object.hasOwn(cantidades, id) ? cantidades[id] : 0;
                const anteriores = Object.hasOwn(vendidas, id) ? vendidas[id] : 0;
                cantidadesPedido[id] = cantidad;
                unidadesNuevas[id] = anteriores + cantidad;
                if (cantidad > 0) {
                    unidadesEsperadas[id] = anteriores + cantidad;
                }
                total += precio * cantidad;
            }
            if (total <= 0) {
                throw new ErrorCompra('Tu carrito está vacío.');
            }
            transaccion.set(pedidoRef, {
                uid,
                cantidades: cantidadesPedido,
                precios: datosPrecios['precios'],
                total,
                fecha: serverTimestamp()
            });
            transaccion.update(ventasRef, { unidades: unidadesNuevas, ultimoPedido: { uid, pedidoId } });
            return { estado: 'creado', unidadesEsperadas };
        });
        if (resultado.estado === 'creado') {
            this.ventasEsperadas.set(pedidoId, resultado.unidadesEsperadas);
        }
        return resultado;
    }

    pedidoReflejado(pedidoId: string): boolean {
        if (this.estadoVentas() !== 'en-vivo') {
            return false;
        }
        const esperadas = this.ventasEsperadas.get(pedidoId);
        if (esperadas === undefined) {
            return true;
        }
        const actuales = this.unidadesVendidas();
        for (const [id, minimo] of Object.entries(esperadas)) {
            if (!Object.hasOwn(actuales, id) || actuales[id] < minimo) {
                return false;
            }
        }
        return true;
    }

    async leerPedido(uid: string, pedidoId: string): Promise<Pedido | null> {
        if (!FORMATO_ID_PEDIDO.test(pedidoId)) {
            return null;
        }
        const instantanea = await getDoc(doc(db, 'usuarios', uid, 'pedidos', pedidoId));
        const datos = instantanea.data();
        if (datos === undefined) {
            return null;
        }
        return convertirPedido(instantanea.id, datos);
    }

    escucharPedidos(uid: string, alRecibir: (pedidos: Pedido[]) => void, alFallar: () => void): Unsubscribe {
        const consulta = query(collection(db, 'usuarios', uid, 'pedidos'), orderBy('fecha', 'desc'));
        return onSnapshot(
            consulta,
            (instantanea) => {
                alRecibir(instantanea.docs.map((documento) => convertirPedido(documento.id, documento.data({ serverTimestamps: 'estimate' }))));
            },
            () => {
                alFallar();
            }
        );
    }

    ngOnDestroy(): void {
        this.suscriptoresVentas = 0;
        this.detenerEscuchaVentas();
    }

    private async leerCatalogo(): Promise<void> {
        this.estadoCatalogo.set('cargando');
        this.errorCatalogo.set('');
        try {
            const [productos, relaciones] = await Promise.all([
                getDocs(collection(db, 'productos')),
                getDoc(doc(db, 'catalogos', 'relaciones'))
            ]);
            const lista = productos.docs.map((documento) => convertirProducto(documento.id, documento.data()));
            let aristas: Arista[] = [];
            const datosRelaciones = relaciones.data();
            if (datosRelaciones !== undefined) {
                aristas = convertirAristas(datosRelaciones['aristas']);
            }
            this.catalogoBase = lista;
            this.grafo.set(construirGrafo(lista, aristas));
            this.combinarPopularidad();
            this.estadoCatalogo.set('listo');
        } catch {
            this.cargaEnCurso = null;
            this.errorCatalogo.set('No pudimos cargar el catálogo. Revisa tu conexión e inténtalo de nuevo.');
            this.estadoCatalogo.set('error');
        }
    }

    private iniciarEscuchaVentas(): void {
        this.detenerEscuchaVentas();
        this.estadoVentas.set(this.ventasRecibidas ? 'reconectando' : 'conectando');
        this.cancelarVentas = onSnapshot(
            doc(db, 'estadisticas', 'ventas'),
            { includeMetadataChanges: true },
            (instantanea) => {
                if (instantanea.metadata.fromCache || instantanea.metadata.hasPendingWrites) {
                    this.estadoVentas.set(this.ventasRecibidas ? 'reconectando' : 'conectando');
                    return;
                }
                const datos = instantanea.data();
                if (datos !== undefined) {
                    this.unidadesVendidas.set(convertirUnidades(datos['unidades']));
                    this.combinarPopularidad();
                }
                this.ventasRecibidas = true;
                this.estadoVentas.set('en-vivo');
            },
            () => {
                this.cancelarVentas = null;
                this.estadoVentas.set('error');
                this.programarReintento();
            }
        );
    }

    private detenerEscuchaVentas(): void {
        if (this.temporizadorReintento !== null) {
            clearTimeout(this.temporizadorReintento);
            this.temporizadorReintento = null;
        }
        if (this.cancelarVentas !== null) {
            this.cancelarVentas();
            this.cancelarVentas = null;
        }
    }

    private programarReintento(): void {
        if (this.temporizadorReintento !== null) {
            return;
        }
        this.temporizadorReintento = setTimeout(() => {
            this.temporizadorReintento = null;
            if (this.suscriptoresVentas > 0) {
                this.iniciarEscuchaVentas();
            }
        }, ESPERA_REINTENTO_MS);
    }

    private combinarPopularidad(): void {
        const unidades = this.unidadesVendidas();
        this.productos.set(
            this.catalogoBase.map((producto) => {
                const vendidas = unidades[producto.id];
                return { ...producto, popularidad: vendidas === undefined ? 0 : vendidas };
            })
        );
    }
}