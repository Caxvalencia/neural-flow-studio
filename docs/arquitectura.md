# Arquitectura

## Estructura principal

La aplicación está en `src/app` y se divide en componentes, servicios y modelos.

| Archivo | Responsabilidad |
| --- | --- |
| `app.ts` / `app.html` | Shell principal, panel activo, acciones globales y atajos. |
| `canvas/*` | Render del board, pan/zoom, drag-and-drop de capas, conexiones SVG. |
| `node/*` | Render de cada nodo, puertos, selección, drag de nodos y eventos de puerto. |
| `config-panel/*` | Edición de parámetros del nodo seleccionado. |
| `train-panel/*` | Datos, construcción, entrenamiento, métricas y exportación del modelo. |
| `services/graph.service.ts` | Estado del grafo, nodos, conexiones, autosave, plantillas e import/export. |
| `services/tfjs.service.ts` | Validación, construcción, entrenamiento, predicción y exportación TensorFlow.js. |
| `models/graph.model.ts` | Tipos base: nodo, puerto, edge y estado de conexión. |
| `models/layer-types.ts` | Catálogo de capas disponibles y sus parámetros. |

## Modelo de datos

Un nodo (`GraphNode`) contiene:

- `id`: identificador único.
- `type`: tipo de capa, por ejemplo `dense`, `conv2d`, `flatten`.
- `label`: texto visible.
- `x` y `y`: posición en coordenadas del grafo.
- `params`: hiperparámetros de la capa.
- `inputPorts` y `outputPorts`: puertos disponibles.

Una conexión (`Edge`) contiene:

- `sourceNodeId` y `sourcePortId`.
- `targetNodeId` y `targetPortId`.

El estado de arrastre de conexión (`ConnectionDragState`) guarda si hay una conexión activa, el puerto origen y la posición actual del mouse en coordenadas del grafo.

## Estado y reactividad

`GraphService` mantiene un signal privado con el estado completo. Expone valores derivados con `computed`:

- `nodes`
- `edges`
- `selectedNodeId`
- `selectedNode`
- `connectionDrag`
- `canvasTransform`

Los componentes no mutan el estado directamente. Envían eventos a `GraphService`, que actualiza el signal con métodos como:

- `addNode`
- `removeNode`
- `duplicateNode`
- `updateNodePosition`
- `updateNodeParams`
- `startConnectionDrag`
- `endConnectionDrag`
- `removeEdge`
- `panCanvas`
- `zoomCanvas`

## Canvas y coordenadas

El canvas usa dos capas principales:

- `.nodes-layer`: contiene los componentes `app-node`.
- `.connection-overlay`: SVG que dibuja las líneas.

Ambas capas reciben el mismo transform CSS:

```text
translate(x, y) scale(scale)
```

Esto mantiene sincronizados nodos y conexiones durante pan y zoom.

## Conexiones visuales

Las conexiones son paths SVG con curva Bézier cúbica:

```text
M source.x source.y C cp1.x cp1.y cp2.x cp2.y target.x target.y
```

El punto inicial y final se calculan con `getPortPosition` en `CanvasComponent`.

La posición preferida se mide desde el DOM:

1. Se busca el elemento del puerto por `data-node-id` y `data-port-id`.
2. Se toma el centro real de `.port-dot` con `getBoundingClientRect`.
3. Se convierte ese punto de coordenadas de pantalla a coordenadas del grafo con `clientPointToGraph`.

Si el DOM todavía no está disponible, se usa un fallback geométrico basado en:

- Ancho mínimo del nodo.
- Alto del header.
- Alto mínimo del área de puertos.
- Cantidad de puertos.

El template renderiza primero los nodos y luego el SVG. Aunque el SVG aparece después en el DOM, el `z-index` lo mantiene detrás de los nodos. Esto permite medir los puertos reales antes de calcular las líneas.

## Validación de conexiones

`GraphService.canConnect` evita:

- Conectar un nodo consigo mismo.
- Usar puertos inexistentes.
- Repetir la misma conexión.
- Conectar dos edges al mismo puerto de entrada.
- Crear ciclos.

La detección de ciclos recorre desde el target hacia adelante. Si encuentra el source, la conexión nueva cerraría un ciclo y se rechaza.

## Plantillas

`GraphService.loadTemplate` crea grafos prearmados:

- `dense-classifier`: entrada vectorial, capa densa, dropout y salida softmax.
- `cnn-classifier`: entrada de imagen, convolución, pooling, flatten y salida softmax.

Después de cargar una plantilla se hace `resetCanvas` para volver a zoom y posición iniciales.
