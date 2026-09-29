---
title: Actualizar un Model Card
sidebar_label: Actualizar un Model Card
---

import CopyText from '@site/src/components/CopyText';

# Actualizar un Model Card

Un Model Card explica el propósito, las métricas y las limitaciones de un modelo. El portal
muestra la documentación publicada por cada proyecto; los cambios se realizan en su repositorio.

1. Desde la ficha del modelo, abre **Repositorio** y localiza su documentación.
2. Revisa los datos actuales del modelo y confirma qué información debe actualizarse.
3. Si el proyecto dispone del generador de Model Cards, abre su asistente de desarrollo y usa
   el comando `/generar-model-card`. Sigue las instrucciones del proyecto para seleccionar el
   modelo. Si no dispone del generador, edita su Model Card siguiendo esas mismas convenciones.
4. Comprueba el propósito, uso previsto, métricas y limitaciones. La generación automática
   requiere una revisión; no completes cifras que no estén disponibles.
5. Guarda los cambios mediante el flujo de revisión del proyecto. El portal los mostrará en
   su siguiente actualización.

<CopyText value="/generar-model-card" label="Copiar comando" />

## Qué significa la advertencia

**Documentación posiblemente desactualizada** significa que el último commit de los metadatos
es posterior al último commit del Model Card. Es una señal para revisar el documento; no
demuestra que el modelo haya sido reentrenado ni que las cifras sean incorrectas.

## Qué mide la salud documental

El puntaje de 0 a 100 considera los documentos presentes, su relación temporal con los metadatos,
y la declaración de una métrica AUC y tablas fuente. No verifica la calidad del contenido,
el desempeño actual ni el funcionamiento del modelo en producción. El puntaje de un proyecto
es el de su modelo con menor puntaje.
