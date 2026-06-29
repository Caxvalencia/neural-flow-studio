# Entrenamiento y Datos

## Backend TensorFlow.js

`TfjsService` intenta inicializar TensorFlow.js con WebGPU:

1. `tf.setBackend('webgpu')`
2. `tf.ready()`

Si WebGPU no está disponible, usa WebGL como fallback. El panel `Train` muestra el backend activo.

## Validación del grafo

Antes de construir el modelo, se valida que:

- Exista al menos un nodo.
- Exista al menos un nodo `input`.
- Cada `input` tenga un `shape` válido con números positivos.
- Exista al menos una salida, definida como nodo no-input sin conexiones salientes.
- Cada nodo no-input tenga conexiones entrantes.
- Todos los puertos de entrada requeridos estén conectados.
- El grafo sea acíclico.

Si hay errores, se muestran en el panel `Model`.

## Construcción del modelo

`buildModelFromGraph` hace un ordenamiento topológico del grafo. Luego convierte cada nodo a tensores/capas TensorFlow.js:

- `input`: `tf.input`
- `dense`: `tf.layers.dense`
- `conv2d`: `tf.layers.conv2d`
- `conv1d`: `tf.layers.conv1d`
- `lstm`: `tf.layers.lstm`
- `gru`: `tf.layers.gru`
- `simple_rnn`: `tf.layers.simpleRNN`
- `flatten`: `tf.layers.flatten`
- `dropout`: `tf.layers.dropout`
- `batch_norm`: `tf.layers.batchNormalization`
- `max_pool_2d`: `tf.layers.maxPooling2d`
- `avg_pool_2d`: `tf.layers.averagePooling2d`
- `reshape`: `tf.layers.reshape`
- `embedding`: `tf.layers.embedding`
- `global_avg_pool_2d`: `tf.layers.globalAveragePooling2d`
- `global_max_pool_2d`: `tf.layers.globalMaxPooling2d`
- `concatenate`: `tf.layers.concatenate`

Los nodos sin conexiones salientes, excepto `input`, se tratan como salidas del modelo.

## Formato de datos CSV

El CSV espera una fila por muestra. Cada fila contiene primero los valores de entrada y luego los valores de salida.

```text
input_1,input_2,...,input_n,output_1,output_2,...,output_m
```

El número esperado de columnas es:

```text
inputSize + outputSize
```

Donde:

- `inputSize` es el producto del `shape` del primer nodo `input`.
- `outputSize` es el parámetro `units` del primer nodo de salida, o `1` si no existe.

Ejemplo para `shape: [4]` y salida con `units: 3`:

```csv
0.1,0.2,0.3,0.4,1,0,0
-0.2,0.8,0.1,0.5,0,1,0
0.7,-0.1,0.0,0.2,0,0,1
```

Ejemplo para `shape: [28, 28, 1]` y salida con `units: 10`:

```text
784 valores de entrada + 10 valores de salida por fila
```

## Datos generados

El botón `Generate Sample Data` crea datos aleatorios:

- Entradas entre `-1` y `1`.
- Salidas one-hot con tamaño igual a `outputSize`.

Estos datos sirven para probar el flujo técnico, no para entrenar un modelo útil.

## Configuración de entrenamiento

El panel permite modificar:

- `Epochs`: cantidad de pasadas de entrenamiento.
- `Batch Size`: tamaño de lote.
- `Learning Rate`: tasa de aprendizaje.
- `Validation Split`: proporción de datos reservada para validación.
- `Optimizer`: `adam`, `sgd` o `rmsprop`.
- `Loss`: `categoricalCrossentropy`, `binaryCrossentropy`, `meanSquaredError` o `sparseCategoricalCrossentropy`.

Las métricas registradas por defecto incluyen `accuracy`.

## Entrenamiento

Al iniciar entrenamiento:

1. Se construye y valida el modelo.
2. Se compila con la configuración actual.
3. Se convierte `x` a tensor con forma `[samples, ...inputShape]`.
4. Se convierte `y` a tensor 2D.
5. Se ejecuta `model.fit`.
6. Se registran métricas por época.
7. Se liberan los tensores de datos al finalizar.

El panel muestra:

- Progreso por época.
- `loss`
- `val_loss`
- `accuracy`
- `val_accuracy`
- Gráfica simple de métricas.

## Exportación

Hay tres exportaciones distintas:

- `Export graph`: descarga la estructura visual del grafo como JSON.
- `Download`: descarga `model.json` usando `model.toJSON()`.
- `Export TS`: genera un archivo `model.ts` con código TensorFlow.js para reconstruir el modelo.

Si el grafo tiene errores, `Export TS` devuelve un archivo con comentarios indicando qué se debe corregir antes de exportar un modelo válido.

## Limitaciones actuales

- El entrenamiento soporta un único tensor de entrada y un único tensor de salida.
- El generador de datos produce datos sintéticos aleatorios.
- `stopTraining` crea un `AbortController`, pero TensorFlow.js `model.fit` no se interrumpe automáticamente con esa señal en la implementación actual.
- La salida de entrenamiento se infiere desde el primer nodo no-input sin conexiones salientes.
