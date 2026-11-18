import { existsSync } from 'node:fs';
import { initializeApp, applicationDefault, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { PRODUCTOS, ARISTAS, mapaDePrecios } from './datos-iniciales.mjs';

function validarDatos() {
    const ids = new Set();
    const nombres = new Set();
    const porCategoria = {};
    for (const item of PRODUCTOS) {
        if (ids.has(item.id) || nombres.has(item.nombre)) {
            throw new Error('Producto repetido: ' + item.id);
        }
        if (!Number.isInteger(item.precio) || item.precio <= 0) {
            throw new Error('Precio inválido en ' + item.id);
        }
        if (item.especificaciones.length !== 4) {
            throw new Error('Se esperaban 4 especificaciones en ' + item.id);
        }
        ids.add(item.id);
        nombres.add(item.nombre);
        if (porCategoria[item.categoriaId] === undefined) {
            porCategoria[item.categoriaId] = 0;
        }
        porCategoria[item.categoriaId] += 1;
    }
    if (ids.size !== 24) {
        throw new Error('Se esperaban 24 productos y hay ' + ids.size);
    }
    for (const categoria of Object.keys(porCategoria)) {
        if (porCategoria[categoria] !== 6) {
            throw new Error('La categoría ' + categoria + ' no tiene 6 productos');
        }
    }
    const aristas = new Set();
    for (const [origen, destino] of ARISTAS) {
        if (!ids.has(origen) || !ids.has(destino)) {
            throw new Error('Relación con un producto inexistente: ' + origen + ' - ' + destino);
        }
        if (origen === destino) {
            throw new Error('Relación de un producto consigo mismo: ' + origen);
        }
        const clave = origen < destino ? origen + '|' + destino : destino + '|' + origen;
        if (aristas.has(clave)) {
            throw new Error('Relación repetida: ' + clave);
        }
        aristas.add(clave);
    }
    return ids;
}

function crearAplicacion() {
    const emulador = process.env.FIRESTORE_EMULATOR_HOST;
    if (typeof emulador === 'string' && emulador !== '') {
        const proyecto = process.env.GCLOUD_PROJECT;
        const projectId = typeof proyecto === 'string' && proyecto !== '' ? proyecto : 'demo-jumi';
        return { app: initializeApp({ projectId }), destino: 'emulador ' + emulador + ' (' + projectId + ')' };
    }
    const credencial = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (typeof credencial !== 'string' || credencial === '') {
        throw new Error('Define GOOGLE_APPLICATION_CREDENTIALS con la ruta de la clave de servicio antes de ejecutar la carga.');
    }
    if (!existsSync(credencial)) {
        throw new Error('No existe el archivo indicado en GOOGLE_APPLICATION_CREDENTIALS: ' + credencial);
    }
    return {
        app: initializeApp({ credential: applicationDefault(), projectId: 'jumi-shopping-app' }),
        destino: 'proyecto jumi-shopping-app'
    };
}

async function cargar() {
    const ids = validarDatos();
    const { app, destino } = crearAplicacion();
    try {
        const db = getFirestore(app);

        const lote = db.batch();
        for (const item of PRODUCTOS) {
            const { id, ...datos } = item;
            lote.set(db.collection('productos').doc(id), datos);
        }
        lote.set(db.doc('catalogos/precios'), { precios: mapaDePrecios() });
        lote.set(db.doc('catalogos/relaciones'), {
            aristas: ARISTAS.map(([origen, destino]) => ({ origen, destino }))
        });
        await lote.commit();

        const ventasRef = db.doc('estadisticas/ventas');
        const conVentas = await db.runTransaction(async (transaccion) => {
            const ventas = await transaccion.get(ventasRef);
            let actuales = {};
            if (ventas.exists) {
                const datos = ventas.data();
                if (datos.unidades !== undefined && datos.unidades !== null) {
                    actuales = datos.unidades;
                }
            }
            const unidades = {};
            let cantidadConVentas = 0;
            for (const item of PRODUCTOS) {
                const valor = actuales[item.id];
                unidades[item.id] = Number.isInteger(valor) && valor >= 0 ? valor : 0;
                if (unidades[item.id] > 0) {
                    cantidadConVentas += 1;
                }
            }
            if (ventas.exists) {
                transaccion.update(ventasRef, { unidades });
            } else {
                transaccion.set(ventasRef, { unidades });
            }
            return cantidadConVentas;
        });

        const productos = await db.collection('productos').get();
        const sobrantes = productos.docs.map((documento) => documento.id).filter((id) => !ids.has(id));
        console.log('Destino: ' + destino);
        console.log('Productos en Firestore: ' + productos.size);
        console.log('Precios canónicos: ' + Object.keys(mapaDePrecios()).length);
        console.log('Relaciones: ' + ARISTAS.length);
        console.log('Productos con ventas conservadas: ' + conVentas);
        if (productos.size !== 24 || sobrantes.length > 0) {
            console.error('Hay documentos que no pertenecen al catálogo: ' + sobrantes.join(', '));
            process.exitCode = 1;
        }
    } finally {
        await deleteApp(app);
    }
}

cargar().catch((error) => {
    console.error('La carga falló: ' + error.message);
    process.exitCode = 1;
});