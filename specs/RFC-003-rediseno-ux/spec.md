---
type: rfc
proyecto: "knowledge-center"
rfc: RFC-003
estado: aceptado   # borrador | en-revision | aceptado | rechazado | superado
fecha: 2026-09-29
fecha_aceptado: 2026-09-29
tags: [rfc, contrato, sdd, ux]
---

# RFC-003 — Rediseño UX: de landing a herramienta

> Spec (SDD) → [`plan.md`](./plan.md) → [`tasks.md`](./tasks.md). **Aceptado por delegación**: Luis
> pidió escribirlo, aceptarlo y ejecutarlo ("confío en tu trabajo"). Nace de la auditoría UX/UI
> del 2026-09-29, hecha sobre capturas de producción en claro, oscuro y móvil.

## 1. Contexto y problema

RFC-002 agregó salud, drift, linaje y portafolio, pero el dashboard siguió armado como la landing
del "tracker de docs" original, con lo nuevo apilado encima. La auditoría encontró:

- **Jerarquía invertida:** un hero de marketing de unos 450 px empuja lo accionable ("Requiere
  atención") debajo del pliegue.
- **Colores con 3 significados:** en la misma card, el verde significa "producción", "doc
  completa" y "saludable", y el ámbar significa "desarrollo" y "atención". Rompe la regla de
  colores de estado reservados que el propio RFC-002 fijó.
- **Ruido en la card:** 5 indicadores compiten entre sí (anillo de completitud, estado, "x/N con
  doc", salud y puntos por modelo), más un botón con gradiente repetido 5 veces.
- **Bug visible:** "¿Qué es este proyecto?" muestra el README crudo (código aplastado, un
  `## Flujo` literal y el texto de relleno del template).
- **El drift no avisa donde importa:** quien lee un Model Card desactualizado no se entera.
- Los motivos de salud describen el problema, no la acción. La actividad del portafolio usa
  lenguaje de commits. `/docs/intro` está vacía y tiene emoji y voseo.

## 2. Objetivo

Que en cada pantalla lo primero que se vea sea **qué hacer**, con un solo significado por color.
**"Hecho"** = los criterios del §8 verificados con Playwright en producción.

## 3. Alcance

**Dentro:** dashboard, card, detalle, Model Card (aviso de drift), portafolio (actividad y aviso de
calidad de datos), `/docs/intro`, README del template y de los repos demo, y los motivos de salud
redactados como acción.

**Fuera:** cambios al cálculo de salud (pesos y umbrales de ADR-003 intactos), páginas nuevas,
autenticación y el `/linaje` en sí (la auditoría lo aprobó).

## 4. Requisitos

### Semántica y datos
- **R1** Verde, ámbar y rojo significan **solo salud**. El estado de ciclo de vida (producción,
  desarrollo, nuevo) se muestra neutro, con ícono y etiqueta. La completitud por modelo va en
  glifo monocromo (lleno, medio o vacío).
- **R2** Los motivos de salud se redactan como acción: "Falta lineage.md y functions.md",
  "Regenera el Model Card (55 días de atraso)", "Declara una métrica de desempeño en
  model_data.json", "Declara las tablas fuente en model_data.json".
- **R3** El resumen del proyecto es la **introducción del README**: los párrafos antes del primer
  encabezado `##`, sin bloques de código. El template y los repos demo dejan de tener texto de
  relleno.
- **R4** El Model Card publicado de un modelo con drift lleva, arriba, un aviso con los días de
  atraso y un link al detalle. Lo inyecta el agregador (vista computada: no se toca el repo
  fuente).

### Dashboard
- **R5** Encabezado compacto (título + 4 KPIs en línea) en lugar del hero. En móvil, KPIs en 2 × 2.
- **R6** Orden: "Requiere atención" → barra de herramientas → grilla.
- **R7** La barra de herramientas tiene buscador (proyecto o modelo), chips de estado y de salud
  con conteo, selector de área y orden (peor salud primero por defecto, o por nombre). Todo queda
  reflejado en la URL.
- **R8** Card nueva: toda la card es clicable. Nombre; área · estado neutro; salud como cifra
  principal (puntaje + ícono + nivel); una línea de resumen ("2 modelos · 1 con drift"); chips
  por modelo con punto de salud; y "Repositorio ↗" como link secundario. Sin anillo y sin botón
  con gradiente.
- **R9** Las filas de "Requiere atención" son clicables enteras y muestran la acción (R2).

### Detalle
- **R10** Arriba, "Salud de los modelos": una mini-lista de barras por modelo que enlaza a cada
  bloque.
- **R11** Cada modelo va en un bloque colapsable. Con más de 2 modelos, arranca abierto solo el de
  peor salud.
- **R12** La metadata (algoritmo, AUC, features, tablas) va en una lista compacta, y hay un botón
  "Abrir Model Card" visible.
- **R13** El histórico queda colapsado por defecto, con conteo de eventos.

### Portafolio y docs
- **R14** La actividad se traduce a eventos legibles ("Proyecto creado", "Reentrenamiento de X",
  "Documentación de X actualizada", "Release v1.0.0").
- **R15** Si hay proyectos sin área, aparece un aviso de calidad de datos (falta `project.yaml`).
- **R16** `/docs/intro` sin emoji, en tuteo y útil: qué contiene cada sección y links a
  dashboard, portafolio y linaje.

## 5. Alternativas consideradas

- **Mantener el hero y achicarlo:** se descarta. Un dashboard de uso diario no necesita
  presentarse; el nombre ya está en la navbar.
- **Colorear el estado de ciclo de vida con otra paleta (azules):** se descarta. Sumaría una
  cuarta familia de color a descifrar; con neutro, ícono y etiqueta alcanza.
- **Tabla en vez de cards:** es tentadora para muchos proyectos, pero se pierden los chips de
  modelo. Se revisa si el portafolio supera unos 30 proyectos.
- **Aviso de drift escrito en el repo fuente:** se descarta. Rompe la vista computada (ADR-001) y
  obliga a commits automáticos en los repos de otros equipos.

## 6. ¿Agente LLM?

No. Todo es presentación determinista.

## 7. Riesgos

- **Cambiar el texto de los motivos** rompe la búsqueda de "desactualizado" en tests y scripts.
  Se actualizan juntos.
- **Tocar los README de los repos demo** cambia su historial, pero no el drift: solo se tocan
  `README.md` y `project.yaml`, no `docs/`.

## 8. Criterios de aceptación

- [x] En la card y en el dashboard, verde, ámbar y rojo aparecen solo junto a indicadores de salud.
- [x] El primer pliegue del dashboard (1440 × 900) muestra "Requiere atención".
- [x] El buscador encuentra por nombre de modelo, y los filtros combinados sobreviven a una recarga
      (URL).
- [x] El resumen del proyecto no contiene `##`, bloques de código ni texto de relleno.
- [x] El Model Card de `lgd_GLM_bestModel` muestra el aviso de drift (55 días).
- [x] La actividad del portafolio no contiene prefijos de commit (`chore:`, `feat(`, `docs(`).
- [x] Tests del agregador en verde; Playwright en producción en ambos temas y móvil, sin errores
      de consola.
