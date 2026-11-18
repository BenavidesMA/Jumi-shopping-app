# JUMI — Tienda web de tecnología y periféricos

**Tecnología que va contigo.**

JUMI es una aplicación web desarrollada como proyecto final de **Estructuras de Datos II**. Permite explorar un catálogo de periféricos, consultar sus características, gestionar un carrito y realizar compras simuladas mediante una interfaz basada en la propuesta gráfica diseñada en Figma.

El proyecto integra cinco estructuras de datos en funciones de la tienda, autenticación real con Firebase, persistencia en Cloud Firestore y actualización de los productos más vendidos en tiempo real.

## Integrantes

| Integrante |
| --- |
| Miguel Angel Benavides |
| Juan Esteban Bermudez Montenegro |

### Origen del nombre

El nombre **JUMI** nace de combinar los nombres de los integrantes: **JU**an y **MI**guel. Esta unión representa la identidad del equipo y da nombre a la tienda.

## Enlaces de entrega

| Recurso | Enlace |
| --- | --- |
| Repositorio del proyecto | [Jumi-shopping-app en GitHub](https://github.com/BenavidesMA/Jumi-shopping-app) |
| Propuesta gráfica y prototipo | [JUMI_Prototipo_Interfaz en Figma](https://www.figma.com/proto/vdwqY1dW4GEf8C2VF69CbS/JUMI_v1?node-id=0-1&t=jk0NJp6rRtNRPQBF-1) |
| Aplicación publicada | [JUMI en Netlify](https://jumi-shop.netlify.app/inicio) |

## Alcance del sistema

La tienda está orientada a la exploración y compra simulada de **teclados, mouses, audífonos y monitores**. Su interfaz de escritorio conserva la identidad visual, distribución y navegación de la propuesta gráfica.

El catálogo contiene **24 productos**, distribuidos de la siguiente manera:

| Categoría | Total | Distribución |
| --- | ---: | --- |
| Teclados | 6 | 3 mecánicos y 3 de membrana |
| Mouses | 6 | 3 alámbricos y 3 inalámbricos |
| Audífonos | 6 | 3 con cable y 3 inalámbricos |
| Monitores | 6 | 2 Full HD, 2 QHD y 2 4K |

Los precios se presentan en **pesos colombianos (COP)**. Las descripciones, imágenes y especificaciones forman parte del catálogo académico de ejemplo.

### Funcionalidades

- **Inicio:** presentación de la tienda, accesos por categoría, productos más vendidos y vistos recientemente.
- **Catálogo:** búsqueda por nombre y navegación por categorías y subcategorías.
- **Detalle del producto:** imagen, descripción, precio, disponibilidad, especificaciones y acción para agregar al carrito.
- **Carrito:** agregar productos, modificar cantidades, eliminar líneas y calcular subtotales y total.
- **Vistos recientemente:** historial de las últimas visitas a productos, presentado desde la más reciente.
- **Productos relacionados:** recomendaciones asociadas al producto consultado.
- **Autenticación:** registro, inicio y cierre de sesión con correo electrónico y contraseña mediante Firebase Authentication.
- **Compra simulada:** revisión, confirmación y almacenamiento del pedido en Firestore.
- **Mis compras:** consulta de los pedidos del usuario autenticado.
- **Más vendidos en vivo:** actualización automática del ranking a partir de las ventas registradas.

La compra es una simulación académica: **no procesa pagos ni realiza cobros reales**. El registro, el acceso, el almacenamiento de pedidos y la actualización de datos sí utilizan Firebase.

## Tecnologías utilizadas

| Tecnología | Uso en el proyecto |
| --- | --- |
| Angular | Aplicación web organizada mediante componentes standalone, páginas y componentes reutilizables |
| TypeScript | Lógica de la aplicación e implementación de estructuras de datos |
| HTML | Estructura de las interfaces |
| SASS / SCSS | Estilos, variables y composición visual |
| Angular Router | Navegación entre vistas y protección de rutas mediante guards |
| Firebase Authentication | Registro y autenticación por correo y contraseña |
| Cloud Firestore | Catálogo, pedidos y datos de ventas con actualizaciones en tiempo real |
| Figma | Propuesta gráfica y prototipo de navegación |
| Netlify | Publicación del frontend |
| Git y GitHub | Control de versiones y colaboración |

## Estructuras de datos implementadas

Las estructuras forman parte del funcionamiento de la aplicación. Su elección responde a la operación que necesita cada sección de la tienda.

### 1. Lista enlazada — Carrito de compras

Cada nodo representa una línea del carrito con un producto y su cantidad. `append` incorpora una nueva línea y `remove` elimina la correspondiente. Si se agrega nuevamente un producto existente, se incrementa su cantidad sin duplicar la línea.

`size()` permite obtener el número de productos distintos que muestra el contador del carrito. El recorrido de los nodos permite calcular los subtotales y el total a partir del precio y la cantidad de cada producto.

**Justificación:** permite representar una colección de líneas que se agregan y eliminan durante la compra, manteniendo enlaces entre sus elementos y un recorrido explícito para calcular el resumen.

### 2. Pila — Vistos recientemente

Cada apertura del detalle de un producto incorpora una visita mediante `push`. El historial se consulta en orden **LIFO**: la última visita aparece primero. `peek` permite consultar la visita más reciente.

La interfaz muestra hasta seis visitas y permite productos repetidos cuando se visitan de nuevo. Mostrar el historial no consume ni elimina las entradas de la pila.

**Justificación:** el orden de una pila coincide con la necesidad de dar prioridad a los productos consultados más recientemente.

### 3. Árbol N-ario — Categorías y subcategorías

El nodo raíz representa **Todos los productos**. Sus hijos son las cuatro categorías principales y cada categoría contiene los nodos de sus subcategorías. `agregarHijo` construye esta jerarquía.

Al seleccionar una categoría, un recorrido **DFS** de su subárbol reúne los productos de esa categoría y de sus descendientes. De esta manera, seleccionar Teclados incluye tanto Mecánicos como De membrana.

**Justificación:** las categorías tienen una relación jerárquica y pueden contener varios hijos; un árbol N-ario representa directamente esa organización y permite consultar ramas completas.

### 4. Heap — Más vendidos

La sección Más vendidos utiliza un **min-heap**. Para obtener primero los productos con mayor popularidad, la prioridad se representa con la popularidad en negativo y las comparaciones se realizan sobre ese campo numérico.

`heapify` construye el heap a partir de los productos y `pop` extrae los primeros del ranking. La extracción se realiza sobre una estructura temporal para conservar el catálogo. En el ranking por categoría, se utilizan los productos obtenidos del recorrido del árbol.

**Justificación:** el heap permite recuperar los productos prioritarios sin sustituir la estructura por una lista fija. Su reconstrucción conecta los cambios de ventas con el ranking visible.

### 5. Grafo — Productos relacionados

Cada producto representa un nodo y `addEdge` conecta productos relacionados. La lista de adyacencia `adjList` permite consultar los vecinos del producto actual y presentarlos en **También te puede interesar**.

Las conexiones iniciales corresponden a relaciones de ejemplo entre productos del catálogo.

**Justificación:** las recomendaciones pueden conectar productos de distintas categorías sin formar una jerarquía. Un grafo representa estas asociaciones y permite que un producto tenga varios relacionados.

### Distribución de las estructuras

| Grupo solicitado | Estructuras utilizadas |
| --- | --- |
| Listas, pilas o colas | Lista enlazada y pila |
| Árboles, tries o heaps | Árbol N-ario y heap |
| Grafos | Grafo de productos relacionados |

## Funcionalidad con base de datos en tiempo real

**Más vendidos en vivo** integra Firestore con el heap:

1. Un usuario autenticado confirma una compra simulada.
2. Se guarda el pedido y se actualizan los contadores de los productos comprados.
3. Las vistas abiertas reciben los cambios mediante la escucha de Firestore.
4. Se reconstruye el heap y se recalcula el ranking general o el de la categoría seleccionada.

Agregar un producto al carrito o cambiar su cantidad no constituye una venta. La actualización de popularidad corresponde a la confirmación correcta de la compra.

Esta funcionalidad cubre el uso de una base de datos en tiempo real mediante una operación propia de la tienda.

## Navegación y acceso a datos

### Acceso público

Los visitantes pueden consultar Inicio, Catálogo, categorías, detalles de productos y el carrito.

### Acceso privado

La revisión y confirmación de compra, así como Mis compras, requieren autenticación. Los guards de Angular Router controlan el acceso a estas vistas. Cuando el acceso se inicia desde el carrito, el flujo conserva los productos para continuar la compra.

Firebase Authentication administra las cuentas. Las reglas de Firestore complementan la protección de navegación y restringen el acceso a los pedidos de cada usuario. Las contraseñas no se almacenan como documentos del catálogo o de los pedidos.

## Organización de la aplicación

La aplicación separa las páginas de los componentes reutilizables, como el encabezado, el footer, las tarjetas y los bloques asociados a las estructuras de datos.

Los componentes padres componen las vistas y se comunican con sus hijos mediante entradas y eventos. Los servicios compartidos gestionan autenticación, acceso a datos y estado utilizado entre páginas. Angular Router organiza los recorridos públicos y privados.

Esta separación permite reutilizar las mismas tarjetas y bloques comerciales en Inicio, Catálogo y Detalle, conservando una interfaz coherente con Figma.

## Recorrido de uso

1. Abrir la aplicación publicada y explorar el catálogo.
2. Elegir una categoría o buscar un producto por su nombre.
3. Abrir su detalle para consultar características, relacionados e historial reciente.
4. Agregar productos al carrito y ajustar sus cantidades.
5. Crear una cuenta o iniciar sesión para continuar con la compra.
6. Revisar el resumen y confirmar la compra simulada.
7. Consultar el pedido en Mis compras y observar la actualización de Más vendidos.

## Control de versiones y aportes

- [Historial de commits de main](https://github.com/BenavidesMA/Jumi-shopping-app/commits/main/).
- [Ramas del repositorio](https://github.com/BenavidesMA/Jumi-shopping-app/branches).

