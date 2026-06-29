<div align="center">
  <img src="docs/assets/neural-flow-studio-logo.svg" alt="Neural Flow Studio Logo" width="260" />
  <h1>Neural Flow Studio</h1>
  <p><b>Constructor visual de redes neuronales con TensorFlow.js y aceleracion Web</b></p>

  <p>
    <a href="https://angular.dev/" target="_blank" rel="noopener noreferrer">
      <img src="https://img.shields.io/badge/Angular-v21-red?style=flat-square&logo=angular" alt="Angular" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank" rel="noopener noreferrer">
      <img src="https://img.shields.io/badge/TypeScript-v5.9-blue?style=flat-square&logo=typescript" alt="TypeScript" />
    </a>
    <a href="https://pnpm.io/" target="_blank" rel="noopener noreferrer">
      <img src="https://img.shields.io/badge/pnpm-v10%2B-orange?style=flat-square&logo=pnpm" alt="pnpm" />
    </a>
    <a href="https://www.tensorflow.org/js" target="_blank" rel="noopener noreferrer">
      <img src="https://img.shields.io/badge/TensorFlow.js-v4.22-ff6f00?style=flat-square&logo=tensorflow" alt="TensorFlow.js" />
    </a>
    <a href="https://www.tensorflow.org/js/guide/platform_environment" target="_blank" rel="noopener noreferrer">
      <img src="https://img.shields.io/badge/WebGPU-WebGL%20%7C%20WASM%20%7C%20CPU-brightgreen?style=flat-square" alt="TensorFlow.js backends" />
    </a>
  </p>
</div>

---

**Neural Flow Studio** es una aplicacion web desarrollada con Angular y TensorFlow.js para disenar, conectar, validar, entrenar y exportar redes neuronales desde un canvas visual.

La app permite construir modelos por capas, configurar hiperparametros, cargar o generar datos de entrenamiento, revisar metricas en tiempo real y cambiar el backend de ejecucion entre WebGPU, WebGL, WASM y CPU segun la compatibilidad del navegador.

---

## Caracteristicas

- Canvas visual con grilla punteada, pan con drag y zoom.
- Plantillas `Dense` y `CNN` para arrancar rapido.
- Selector de backend TensorFlow.js: WebGPU, WebGL, WASM y CPU.
- Datasets publicos cargados en caliente: MNIST, Iris y Boston Housing.
- Tooltips custom para controles, capas y parametros.
- Exportacion de grafo, modelo JSON y codigo TypeScript.

---

## Documentacion

La documentacion funcional del proyecto esta en [`docs/`](./docs/README.md):

- [Guia de usuario](./docs/guia-usuario.md)
- [Arquitectura](./docs/arquitectura.md)
- [Entrenamiento y datos](./docs/entrenamiento-y-datos.md)

## Requisitos

- Node.js 18+
- pnpm 10+
- Navegador moderno con soporte para WebGPU o WebGL

## Desarrollo

Instala dependencias:

```bash
pnpm install
```

Inicia el servidor local:

```bash
pnpm start
```

Luego abre `http://localhost:4200/`.

## Build

Compila la aplicacion:

```bash
pnpm build
```

Los artefactos quedan en `dist/`.

## Tests

Ejecuta las pruebas:

```bash
pnpm test
```
