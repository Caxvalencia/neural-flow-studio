# Guía de Usuario

## Pantalla principal

La aplicación se organiza en tres zonas:

- `Topbar`: muestra el nombre, conteo de nodos/conexiones, estado de guardado y acciones globales.
- `Canvas`: área donde se agregan, mueven y conectan capas.
- `Panel lateral`: alterna entre configuración de nodos (`Configure`) y entrenamiento (`Train`).
- `Toolbar del board`: barra inferior con plantillas, duplicado, borrado, autosave, atajos y limpieza del grafo.

Los controles principales muestran tooltips custom al pasar el cursor o enfocar con teclado.

## Crear una red

Hay dos formas de empezar:

- Arrastrar capas desde el panel `Layers` hacia el canvas.
- Usar una plantilla desde la toolbar inferior del board:
  - `Dense`: clasificador denso simple con Input, Dense, Dropout y Dense de salida.
  - `CNN`: red convolucional con Input, Conv2D, MaxPool2D, Flatten y Dense de salida.

Cada nodo representa una capa de TensorFlow.js. Sus puntos laterales son puertos:

- Puertos de entrada: lado izquierdo.
- Puertos de salida: lado derecho.

## Conectar nodos

Para conectar dos capas:

1. Arrastra desde el puerto de salida de un nodo.
2. Suelta sobre el puerto de entrada de otro nodo.

También puedes hacer clic en una salida y luego clic en una entrada. La aplicación valida que:

- No conectes un nodo consigo mismo.
- No dupliques la misma conexión.
- Una entrada no tenga más de una conexión.
- No se formen ciclos en el grafo.

Para borrar una conexión, haz clic sobre la línea.

## Mover y navegar el canvas

- `Wheel`: mueve el board.
- `Shift + Wheel`: mueve horizontalmente.
- `Ctrl/Cmd + Wheel`: zoom centrado en el cursor.
- `Empty + Drag`: arrastra un área vacía del board para moverlo manualmente.
- Botón de reset: vuelve a la posición y zoom iniciales.
- Botón de grid: activa o desactiva la grilla.

El board usa una grilla punteada clara como referencia visual.

## Configurar nodos

Selecciona un nodo para abrir sus parámetros en `Configure`. El panel muestra los campos definidos para el tipo de capa:

- Números: por ejemplo `units`, `filters`, `kernelSize`, `strides`.
- Selectores: por ejemplo `activation`, `padding`.
- Booleanos: por ejemplo `useBias`.
- Arreglos: por ejemplo `shape` o `targetShape`, escritos como valores separados por coma.

Los cambios se guardan inmediatamente en el estado del grafo.

Cada parámetro muestra un tooltip con su función, rango cuando aplica y valor por defecto.

## Cargar datasets

En `Train > Training Data`, el botón `Load Dataset` abre un modal con datasets públicos listos para usar.

Datasets disponibles:

- `MNIST digits - train`: imágenes 28×28×1 y 10 salidas one-hot.
- `MNIST digits - test`: split de prueba de MNIST.
- `Iris flowers - train`: 4 features numéricas y 3 clases.
- `Iris flowers - test`: split de prueba de Iris.
- `Boston Housing - train`: regresión tabular con 12 features y 1 salida.
- `Boston Housing - test`: split de prueba de Boston Housing.

Al cargar un dataset:

- Se descargan los datos en caliente desde rutas públicas con CORS habilitado.
- Se limita la cantidad de muestras según el valor `Samples`.
- Se carga una plantilla compatible (`CNN` para MNIST, `Dense` para tabulares).
- Se ajustan `shape`, unidades de salida, activación final, `loss` y métricas.
- Se construye automáticamente el modelo compatible.

## Acciones globales

- `Import graph`: carga un archivo JSON previamente exportado.
- `Export graph`: descarga el grafo actual como `neural-flow-studio-graph.json`.

Acciones de la toolbar del board:

- `Dense`: carga la plantilla densa.
- `CNN`: carga la plantilla convolucional.
- `Duplicate`: duplica el nodo seleccionado.
- `Delete`: elimina el nodo seleccionado y sus conexiones.
- `Restore`: restaura el último autosave desde `localStorage`.
- `Clear autosave`: borra solo el autosave local.
- `Shortcuts`: abre el modal de atajos.
- `Clear graph`: elimina el grafo actual.

## Atajos

- `Cmd/Ctrl + D`: duplica el nodo seleccionado.
- `Delete` o `Backspace`: elimina el nodo seleccionado.
- `Empty + Drag`: mueve el board.
- `Wheel`: mueve el board.
- `Ctrl/Cmd + Wheel`: zoom.
- `?`: abre los atajos.
- `Esc`: cierra el modal de atajos.

## Autosave

El grafo se guarda automáticamente en `localStorage` con la llave `neural-flow-studio.graph`. El autosave incluye:

- Nodos.
- Conexiones.
- Transformación del canvas: posición y zoom.

El autosave no reemplaza la exportación manual; para compartir o versionar un grafo, usa `Export graph`.
