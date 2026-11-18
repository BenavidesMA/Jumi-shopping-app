import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Auth } from './auth';
import { BaseDatos, ErrorCompra } from './base-datos';
import { LinkedList, MAXIMO_UNIDADES } from '../carrito-lista-enlazada/carrito-lista-enlazada';
import type { LineaVista } from '../carrito-lista-enlazada/carrito-lista-enlazada';
import { Stack, VISITAS_VISIBLES } from '../vistos-recientemente-pila/vistos-recientemente-pila';
import type { VisitaProducto } from '../vistos-recientemente-pila/vistos-recientemente-pila';
import type { Producto } from '../tarjeta-producto/tarjeta-producto';

interface LineaGuardada {
    id: string;
    cantidad: number;
}

interface VisitaGuardada {
    clave: string;
    id: string;
}

interface IntentoGuardado {
    id: string;
    cantidades: Record<string, number>;
}

const VISITANTE = 'visitante';
const VISITAS_GUARDADAS = 20;

function claveCarrito(propietario: string): string {
    return 'jumi:carrito:' + propietario;
}

function claveVisitas(propietario: string): string {
    return 'jumi:vistos:' + propietario;
}

function claveIntento(uid: string): string {
    return 'jumi:intento:' + uid;
}

function leer(clave: string): unknown {
    try {
        const guardado = localStorage.getItem(clave);
        if (guardado === null) {
            return null;
        }
        return JSON.parse(guardado);
    } catch {
        return null;
    }
}

function escribir(clave: string, valor: unknown): void {
    try {
        localStorage.setItem(clave, JSON.stringify(valor));
    } catch {
        return;
    }
}

function borrar(clave: string): void {
    try {
        localStorage.removeItem(clave);
    } catch {
        return;
    }
}

function esLineaGuardada(valor: unknown): valor is LineaGuardada {
    if (typeof valor !== 'object' || valor === null || !('id' in valor) || !('cantidad' in valor)) {
        return false;
    }
    const cantidad = valor.cantidad;
    return typeof valor.id === 'string'
        && typeof cantidad === 'number'
        && Number.isInteger(cantidad)
        && cantidad >= 1
        && cantidad <= MAXIMO_UNIDADES;
}

function esVisitaGuardada(valor: unknown): valor is VisitaGuardada {
    if (typeof valor !== 'object' || valor === null || !('clave' in valor) || !('id' in valor)) {
        return false;
    }
    return typeof valor.clave === 'string' && typeof valor.id === 'string';
}

function esIntentoGuardado(valor: unknown): valor is IntentoGuardado {
    if (typeof valor !== 'object' || valor === null || !('id' in valor) || !('cantidades' in valor)) {
        return false;
    }
    const cantidades = valor.cantidades;
    if (typeof valor.id !== 'string' || typeof cantidades !== 'object' || cantidades === null) {
        return false;
    }
    return Object.values(cantidades).every((cantidad) => typeof cantidad === 'number');
}

function mismasCantidades(a: Record<string, number>, b: Record<string, number>): boolean {
    const claves = Object.keys(a);
    if (claves.length !== Object.keys(b).length) {
        return false;
    }
    return claves.every((clave) => Object.hasOwn(b, clave) && b[clave] === a[clave]);
}

@Injectable({ providedIn: 'root' })
export class EstadoTienda {
    private readonly auth = inject(Auth);
    private readonly baseDatos = inject(BaseDatos);

    private readonly carrito = new LinkedList();
    private readonly historial = new Stack<VisitaProducto>();
    private propietario: string | null = null;
    private compraEnCurso: Promise<string> | null = null;

    readonly lineas = signal<LineaVista[]>([]);
    readonly productosDistintos = signal(0);
    readonly unidades = signal(0);
    readonly total = signal(0);
    readonly visitas = signal<VisitaProducto[]>([]);
    readonly ultimaVisita = signal<VisitaProducto | null>(null);
    readonly listo = signal(false);

    constructor() {
        void this.baseDatos.cargarCatalogo();
        effect(() => {
            const resuelto = this.auth.resuelto();
            const usuario = this.auth.usuario();
            const estadoCatalogo = this.baseDatos.estadoCatalogo();
            if (!resuelto || estadoCatalogo !== 'listo') {
                return;
            }
            const propietario = usuario === null ? VISITANTE : usuario.uid;
            untracked(() => this.cambiarPropietario(propietario));
        });
    }

    textoConteo(): string {
        const distintos = this.productosDistintos();
        const unidades = this.unidades();
        let texto = distintos + ' productos distintos';
        if (distintos === 1) {
            texto = '1 producto distinto';
        }
        if (unidades === 1) {
            return texto + ' · 1 unidad';
        }
        return texto + ' · ' + unidades + ' unidades';
    }

    agregar(producto: Producto): void {
        const nodo = this.carrito.buscarPorId(producto.id);
        if (nodo === null) {
            this.carrito.append({ producto, cantidad: 1 });
        } else if (nodo.value.cantidad < MAXIMO_UNIDADES) {
            nodo.value.cantidad += 1;
        }
        this.guardarYActualizar();
    }

    cambiarCantidad(id: string, cantidad: number): void {
        const nodo = this.carrito.buscarPorId(id);
        if (nodo === null || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAXIMO_UNIDADES) {
            return;
        }
        nodo.value.cantidad = cantidad;
        this.guardarYActualizar();
    }

    eliminar(id: string): void {
        const nodo = this.carrito.buscarPorId(id);
        if (nodo === null) {
            return;
        }
        this.carrito.remove(nodo.value);
        this.guardarYActualizar();
    }

    vaciarCarrito(): void {
        while (this.carrito.head !== null) {
            this.carrito.remove(this.carrito.head.value);
        }
        this.guardarYActualizar();
    }

    registrarVisita(producto: Producto, apertura: string): void {
        const ultima = this.historial.peek();
        if (ultima !== null && ultima.clave === apertura) {
            return;
        }
        this.historial.push({ clave: apertura, producto });
        this.guardarYActualizar();
    }

    confirmarCompra(): Promise<string> {
        if (this.compraEnCurso === null) {
            this.compraEnCurso = this.ejecutarCompra().finally(() => {
                this.compraEnCurso = null;
            });
        }
        return this.compraEnCurso;
    }

    private async ejecutarCompra(): Promise<string> {
        const usuario = this.auth.usuario();
        if (usuario === null || this.propietario !== usuario.uid) {
            throw new ErrorCompra('Inicia sesión para finalizar tu compra.');
        }
        const uid = usuario.uid;
        const cantidades = this.cantidadesCarrito();
        if (Object.keys(cantidades).length === 0) {
            throw new ErrorCompra('Tu carrito está vacío.');
        }
        const pedidoId = this.obtenerIntento(uid, cantidades);
        try {
            await this.baseDatos.confirmarPedido(uid, pedidoId, cantidades);
        } catch (error) {
            if (!(await this.pedidoGuardado(uid, pedidoId))) {
                throw error;
            }
        }
        borrar(claveIntento(uid));
        this.vaciarCarrito();
        return pedidoId;
    }

    private async pedidoGuardado(uid: string, pedidoId: string): Promise<boolean> {
        try {
            const pedido = await this.baseDatos.leerPedido(uid, pedidoId);
            return pedido !== null;
        } catch {
            return false;
        }
    }

    private obtenerIntento(uid: string, cantidades: Record<string, number>): string {
        const guardado = leer(claveIntento(uid));
        if (esIntentoGuardado(guardado) && mismasCantidades(guardado.cantidades, cantidades)) {
            return guardado.id;
        }
        const intento: IntentoGuardado = { id: this.baseDatos.nuevoIdPedido(uid), cantidades };
        escribir(claveIntento(uid), intento);
        return intento.id;
    }

    private cantidadesCarrito(): Record<string, number> {
        const cantidades: Record<string, number> = {};
        let actual = this.carrito.head;
        while (actual !== null) {
            cantidades[actual.value.producto.id] = actual.value.cantidad;
            actual = actual.next;
        }
        return cantidades;
    }

    private cambiarPropietario(propietario: string): void {
        if (this.propietario === propietario) {
            return;
        }
        const pendientes = this.propietario === null ? this.lineasGuardables() : [];
        const catalogo = this.baseDatos.productos();
        this.vaciarEstructuras();
        this.combinarCarrito(leer(claveCarrito(propietario)), catalogo);
        this.restaurarHistorial(leer(claveVisitas(propietario)), catalogo);
        this.combinarCarrito(pendientes, catalogo);
        if (propietario !== VISITANTE) {
            this.combinarCarrito(leer(claveCarrito(VISITANTE)), catalogo);
            this.restaurarHistorial(leer(claveVisitas(VISITANTE)), catalogo);
            borrar(claveCarrito(VISITANTE));
            borrar(claveVisitas(VISITANTE));
        }
        this.propietario = propietario;
        this.guardarYActualizar();
        this.listo.set(true);
    }

    private vaciarEstructuras(): void {
        while (this.carrito.head !== null) {
            this.carrito.remove(this.carrito.head.value);
        }
        while (!this.historial.isEmpty()) {
            this.historial.pop();
        }
    }

    private combinarCarrito(origen: unknown, catalogo: Producto[]): void {
        if (!Array.isArray(origen)) {
            return;
        }
        for (const item of origen) {
            if (!esLineaGuardada(item)) {
                continue;
            }
            const producto = catalogo.find((candidato) => candidato.id === item.id);
            if (producto === undefined) {
                continue;
            }
            const nodo = this.carrito.buscarPorId(item.id);
            if (nodo === null) {
                this.carrito.append({ producto, cantidad: item.cantidad });
            } else if (item.cantidad > nodo.value.cantidad) {
                nodo.value.cantidad = item.cantidad;
            }
        }
    }

    private restaurarHistorial(origen: unknown, catalogo: Producto[]): void {
        if (!Array.isArray(origen)) {
            return;
        }
        for (const item of origen) {
            if (!esVisitaGuardada(item)) {
                continue;
            }
            const producto = catalogo.find((candidato) => candidato.id === item.id);
            if (producto !== undefined) {
                this.historial.push({ clave: item.clave, producto });
            }
        }
    }

    private lineasGuardables(): LineaGuardada[] {
        return this.carrito.proyectar().map((linea) => ({ id: linea.producto.id, cantidad: linea.cantidad }));
    }

    private guardarYActualizar(): void {
        if (this.propietario !== null) {
            escribir(claveCarrito(this.propietario), this.lineasGuardables());
            const visitas: VisitaGuardada[] = this.historial
                .recientes(VISITAS_GUARDADAS)
                .reverse()
                .map((visita) => ({ clave: visita.clave, id: visita.producto.id }));
            escribir(claveVisitas(this.propietario), visitas);
        }
        this.lineas.set(this.carrito.proyectar());
        this.productosDistintos.set(this.carrito.size());
        this.unidades.set(this.carrito.unidades());
        this.total.set(this.carrito.total());
        this.visitas.set(this.historial.recientes(VISITAS_VISIBLES));
        this.ultimaVisita.set(this.historial.peek());
    }
}