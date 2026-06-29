# Documentación de Neural Flow Studio

Neural Flow Studio es una aplicación Angular para construir, configurar, validar y entrenar redes neuronales visuales con TensorFlow.js. El usuario arma un grafo de capas en un canvas, conecta salidas con entradas, ajusta hiperparámetros y genera un modelo ejecutable en el navegador.

## Documentos

- [Guía de usuario](./guia-usuario.md): flujo de uso de la interfaz, canvas, nodos, conexiones, plantillas, importación y exportación.
- [Arquitectura](./arquitectura.md): componentes principales, servicios, modelos de datos y cómo se calculan las conexiones visuales.
- [Entrenamiento y datos](./entrenamiento-y-datos.md): validación del grafo, formato CSV, configuración de entrenamiento y exportación del modelo.

## Flujo principal

1. Agregar nodos desde el panel de capas o cargar una plantilla.
2. Conectar puertos de salida con puertos de entrada.
3. Seleccionar nodos para editar sus parámetros.
4. Abrir el panel `Train`, generar o pegar datos de entrenamiento.
5. Construir el modelo, entrenarlo y exportar el JSON o el código TypeScript.

## Tecnologías

- Angular 21 con componentes standalone y signals.
- TensorFlow.js con backend WebGPU y fallback a WebGL.
- Canvas HTML/CSS con SVG para dibujar conexiones.
- Persistencia local mediante `localStorage`.
