---
id: intro
title: Documentación
sidebar_label: Inicio
sidebar_position: 0
slug: /intro
---

# Documentación de modelos

Aquí están los documentos técnicos de cada modelo, agrupados por proyecto en el menú lateral. Cada
modelo puede tener tres:

| Documento | Qué responde |
| --- | --- |
| **Model Card** | Qué hace el modelo, para qué decisión se usa, con qué datos y hiperparámetros se entrenó y cómo rinde. |
| **Linaje** | De qué tablas y columnas se alimenta. |
| **Funciones** | Los pasos del pipeline, de la población al score. |

Si un Model Card muestra **documentación posiblemente desactualizada**, sus metadatos tienen
un commit más reciente que el documento. Revisa si sus cifras y explicación siguen vigentes.
La advertencia no demuestra un reentrenamiento. Consulta la [guía de actualización](./actualizar-model-card.md).

## Otras vistas

- **[Dashboard](/)**: qué requiere atención hoy y la salud documental de cada proyecto.
- **[Portafolio](/portafolio)**: la foto general para comité, imprimible a PDF.
- **[Linaje](/linaje)**: qué modelos declaran depender de una tabla.

Todo se recalcula en cada build desde los repos de proyecto. Aquí no se edita nada: para corregir
un documento, cámbialo en el repo del proyecto.
