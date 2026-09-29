---
type: rfc
proyecto: "knowledge-center"
rfc: RFC-004
estado: aceptado
fecha: 2026-09-29
fecha_aceptado: 2026-09-29
tags: [rfc, contrato, sdd, ux]
---

# RFC-004 — Model Card con identidad propia + pulido

> Spec (SDD) → [`plan.md`](./plan.md) → [`tasks.md`](./tasks.md). **Aceptado por delegación**
> ("hazlo"), igual que RFC-003. Sale de la revisión posterior a RFC-003.

## 1. Problema

La página que más lee negocio, el Model Card, sigue siendo Docusaurus de fábrica: no dice de qué
proyecto es, ni su salud, ni cuándo se escribió, y los títulos y tablas no siguen el diseño del
dashboard. Además quedan detalles de pulido: un footer pesado, copy repetido o técnico en las
cards, acciones ocultas en "Requiere atención", redundancias en el detalle, zonas táctiles chicas
en móvil y un link a la cuenta personal de GitHub en la navbar.

## 2. Requisitos

- **R1 · Ficha del modelo.** Arriba de cada documento de un modelo (Model Card, linaje y
  funciones) va una ficha con: proyecto (link al detalle), tipo de documento, salud (badge),
  algoritmo, AUC, fecha del Model Card y versión. Se arma desde el catálogo; el markdown no se
  toca.
- **R2 · El drift vive en la ficha.** El aviso de Model Card desactualizado pasa de un
  admonition inyectado por el agregador a la ficha, con las dos fechas y el link a la salud. Se
  elimina `aviso_drift()` del agregador: una sola fuente para el aviso.
- **R3 · Tipografía y tablas del documento.** Títulos más contenidos, tablas a lo ancho en
  desktop (scroll horizontal en móvil) y encabezados de tabla con el estilo del dashboard.
- **R4 · Footer liviano.** Estilo claro, una línea: "Knowledge Center · datos al <fecha del
  build>".
- **R5 · Copy de la card.** "salud del peor modelo" se explica una sola vez, en la sección, no
  en cada card. "N con drift" pasa a "N Model Card desactualizado(s)".
- **R6 · Acciones ocultas.** Si un modelo tiene más de una acción pendiente, la fila de
  "Requiere atención" muestra "+N" con la lista completa en el tooltip.
- **R7 · Detalle sin redundancia.** Con un solo modelo no se muestra el mini-ranking y el
  resumen ocupa todo el ancho. Un modelo sin narrativa pone su salud primero, en una columna.
- **R8 · Zonas táctiles.** Con puntero grueso (táctil), chips, desplegables y links
  secundarios miden al menos 44 px de alto.
- **R9 · Navbar.** Se quita el link a GitHub (apuntaba a una cuenta personal).

**Fuera:** regenerar los Model Cards de las demos (borraría el caso de drift), linaje por
esquema y vista de tabla de proyectos (hasta que haya más datos).

## 3. Cierre de entrega (2026-09-29)

Luis pidió un entregable completo, sin "falta esto". Se cerró todo lo que había quedado declarado
como pendiente y lo que encontró una auditoría final de todas las páginas (claro, oscuro, móvil,
404 y documentos de linaje y funciones):

- **Model Cards de las demos regenerados** con el autodoc actual (fecha legible, métricas y
  linaje explícitos). Se regeneran desde la metadata vigente cuando se escribió cada card y con su
  misma fecha, así el escenario de drift (55 y 12 días) se conserva.
- **Autodoc:** "Tablas fuente" ya no repite la tabla de linaje.
- **Datos falsos de ejemplo:** el template traía un `model_data.json` de ejemplo (AUC 0.80 y
  una tabla `esquema.tabla_ejemplo`) que el hub publicaba como real. Pasa a
  `model_data.example.json`, que no leen ni el hub ni el autodoc; se corrigió también el repo que
  había nacido con él.
- **Página 404 propia:** en tuteo y con rutas de vuelta (la de fábrica trataba de "usted" y no
  ofrecía salida).
- **Navbar:** "Dashboard" quedaba activo en todas las páginas porque `/` coincidía como prefijo;
  "Documentación" no se marcaba en los documentos de modelos.
- **Linaje:** plurales ("1 modelos") y aviso de los modelos que aún no declaran tablas.
- **Suite E2E en el repo** (`tests/e2e/`, documentada en CONTRIBUTING), con esperados calculados
  desde el catálogo en lugar de números fijos.
- Limpieza: ícono sin uso y estructura del README al día.

**Decisiones deliberadas, no pendientes:** la matriz área × estado, el linaje sin agrupar por
esquema y las cards sin vista de tabla están bien para la escala actual (5 proyectos, 7 tablas).
Cambiarlos hoy sería diseñar para datos que no existen (YAGNI); el punto de revisión está en
RFC-002 §5 y en RFC-003 §5.

## 4. Criterios de aceptación

- [x] El Model Card de `lgd_GLM_bestModel` muestra la ficha con proyecto, salud 60, GLM, fecha
      y el aviso de drift de 55 días; el markdown publicado ya no contiene un admonition de drift.
- [x] El linaje y las funciones de un modelo también muestran la ficha (sin el aviso).
- [x] El footer es claro y muestra la fecha de datos; la navbar no tiene link a GitHub.
- [x] Ninguna card contiene "salud del peor modelo" ni "drift".
- [x] La fila de `ct_LogisticRegression_bestModel` en "Requiere atención" muestra "+3".
- [x] El detalle de Churn Tarjetas (1 modelo) no muestra el mini-ranking.
- [x] Con puntero táctil, los chips miden ≥ 44 px.
- [x] Tests en verde; Playwright en producción en ambos temas y móvil, sin errores de consola.
