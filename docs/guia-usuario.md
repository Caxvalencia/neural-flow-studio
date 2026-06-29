# Guía de Usuario

## Pantalla principal

La aplicación se organiza en tres zonas:

- `Topbar`: muestra el nombre, conteo de nodos/conexiones, estado de guardado y acciones globales.
- `Canvas`: área donde se agregan, mueven y conectan capas.
- `Panel lateral`: alterna entre configuración de nodos (`Configure`) y entrenamiento (`Train`).

## Crear una red

Hay dos formas de empezar:

- Arrastrar capas desde el panel `Layers` hacia el canvas.
- Usar una plantilla desde la barra superior:
  - `Dense template`: clasificador denso simple con Input, Dense, Dropout y Dense de salida.
  - `CNN template`: red convolucional con Input, Conv2D, MaxPool2D, Flatten y Dense de salida.

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
- `Alt + Drag`: arrastra manualmente el board.
- Botón de reset: vuelve a la posición y zoom iniciales.
- Botón de grid: activa o desactiva la grilla.

## Configurar nodos

Selecciona un nodo para abrir sus parámetros en `Configure`. El panel muestra los campos definidos para el tipo de capa:

- Números: por ejemplo `units`, `filters`, `kernelSize`, `strides`.
- Selectores: por ejemplo `activation`, `padding`.
- Booleanos: por ejemplo `useBias`.
- Arreglos: por ejemplo `shape` o `targetShape`, escritos como valores separados por coma.

Los cambios se guardan inmediatamente en el estado del grafo.

## Acciones globales

- `Duplicate`: duplica el nodo seleccionado.
- `Delete node`: elimina el nodo seleccionado y sus conexiones.
- `Import graph`: carga un archivo JSON previamente exportado.
- `Export graph`: descarga el grafo actual como `neural-flow-studio-graph.json`.
- `Restore`: restaura el último autosave desde `localStorage`.
- `Clear autosave`: borra solo el autosave local.
- `Clear`: elimina el grafo actual.
- `Shortcuts`: abre el modal de atajos.

## Atajos

- `Cmd/Ctrl + D`: duplica el nodo seleccionado.
- `Delete` o `Backspace`: elimina el nodo seleccionado.
- `?`: abre los atajos.
- `Esc`: cierra el modal de atajos.

## Autosave

El grafo se guarda automáticamente en `localStorage` con la llave `neural-flow-studio.graph`. El autosave incluye:

- Nodos.
- Conexiones.
- Transformación del canvas: posición y zoom.

El autosave no reemplaza la exportación manual; para compartir o versionar un grafo, usa `Export graph`.
