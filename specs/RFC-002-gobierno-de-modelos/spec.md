---
type: rfc
proyecto: "knowledge-center"
rfc: RFC-002
estado: aceptado   # borrador | en-revision | aceptado | rechazado | superado
fecha: 2026-09-29
fecha_aceptado: 2026-09-29
tags: [rfc, contrato, sdd]
---

# RFC-002 — De "tracker de docs" a gobierno de modelos

> Contrato (spec) en enfoque SDD: **spec.md** (qué y por qué) → [`plan.md`](./plan.md) (cómo) →
> [`tasks.md`](./tasks.md) (en qué orden, verificable). No se programa hasta `estado: aceptado`.
> Continúa [RFC-001](../../RFC.md), que queda vigente para todo lo que este RFC no cambia.

## 1. Contexto y problema

El Knowledge Center funciona en producción (RFC-001): descubre repos `coaa_*`/`coeaa_*`, deriva el
catálogo en vivo y publica un dashboard. Pero hoy **lo que muestra es higiene**: "% de documentos
presentes". Eso no responde las preguntas que se hacen quienes deciden (líder del COE, riesgos,
datos, arquitectura):

- ¿Qué modelos tienen la documentación **desactualizada** respecto a su último entrenamiento?
- **Si cambia o se cae la tabla X, ¿qué modelos se afectan?**
- ¿Cómo está el portafolio completo, por área y estado, de un vistazo?

Además, **la demo estrella está rota**: el template, el dispatcher y el autodoc siguen en el esquema
viejo (1 modelo por repo, prefijo `kc-`). Un repo creado hoy desde un issue **no aparece** en el
dashboard (deuda de RFC-001 §15).

## 2. Objetivo

Que el hub responda esas tres preguntas con datos que **ya existen** en los repos, sin agregar
almacenamiento (se mantiene la vista computada, ADR-001), y que el ciclo issue → repo → dashboard
vuelva a funcionar de punta a punta.

**"Hecho"** = en producción, un repo nuevo creado por issue aparece solo en el dashboard; cada
modelo muestra un **puntaje de salud** con sus motivos y una alerta de **doc drift**; hay una página
de **linaje global** donde clicar una tabla muestra los modelos impactados; y hay una **vista de
portafolio** para comité.

## 3. Alcance

**Dentro**
- **F1 · Cerrar el ciclo:** template, autodoc y dispatcher al esquema multi-modelo
  (`config/mlops_config.json` + `docs/<modelo>/`) y a los prefijos `coaa_`/`coeaa_`.
- **F2 · Salud del modelo:** puntaje 0–100 explicable + detección de doc drift por modelo.
- **F3 · Linaje global:** grafo tablas ↔ modelos de todo el portafolio, con análisis de impacto.
- **F4 · Vista de portafolio:** página ejecutiva con KPIs, área × estado, ranking de salud y
  actividad reciente.
- **F5 · Profesionalización:** tests del agregador en CI, datos demo más realistas, README con
  capturas y guion de demo.

**Fuera (no-objetivos)**
- Preguntarle al portafolio con un LLM (queda para un RFC posterior; ver §6).
- Mapeo a checklist regulatorio (SBS / SR 11-7): vale la pena, pero merece su propio RFC.
- Monitoreo de modelos en producción (drift de *datos* / *performance*): el hub no ve inferencias.
  Aquí "drift" significa **doc drift** (documentación vs. metadata), nada más.
- GitHub App en vez de PAT: sigue como mejora futura (RFC-001 §7).
- Base de datos, snapshots o almacenamiento propio de cualquier tipo.
- Autenticación o roles en el sitio.

## 4. Requisitos

Cada requisito tiene un ID que usan `plan.md` y `tasks.md`.

### F1 — Cerrar el ciclo
- **R1.1** El template genera un repo con `config/mlops_config.json` (1 modelo de ejemplo) y
  `docs/<modelo>/model_data.json`, sin `model_data.json` en la raíz.
- **R1.2** El nombre del repo generado respeta la convención real: `<prefijo><nombre_snake>`, con
  prefijo `coaa_` o `coeaa_` elegido en el issue. No se recorta ni se le agrega `kc-`.
- **R1.3** `notify-hub.yml` dispara también cuando cambia `config/mlops_config.json`.
- **R1.4** La skill de autodoc genera el Model Card **de un modelo**:
  `python autodoc/model_card.py --modelo <name>` lee `docs/<name>/model_data.json` y escribe en
  `docs/<name>/`. Sin `--modelo`, recorre todos los modelos de `config/mlops_config.json`.
- **R1.5** Un issue de nuevo proyecto crea el repo y, tras el rebuild, el proyecto aparece en el
  dashboard **sin intervención manual**.

### F2 — Salud del modelo
- **R2.1** Por modelo, el agregador obtiene la fecha del último commit a `docs/<m>/model-card.md` y
  a `docs/<m>/model_data.json`.
- **R2.2** **Doc drift** = `model_data.json` es más reciente que `model-card.md` (la metadata del
  entrenamiento cambió y el Model Card no se regeneró). Se reporta con los días de atraso.
- **R2.3** **Puntaje de salud** (0–100), transparente y con motivos legibles:

  | Componente | Puntos | Regla |
  | --- | --- | --- |
  | Documentación | 50 | `completitud × 0.5` |
  | Frescura | 30 | 30 sin drift · 15 si drift ≤ 30 días · 0 si drift > 30 días o sin Model Card |
  | Desempeño declarado | 10 | hay métrica (AUC) en `model_data.json` |
  | Linaje declarado | 10 | `table_list` tiene al menos una tabla |

  Nivel: **≥ 80 saludable · 50–79 atención · < 50 crítico**. Cada punto perdido genera un motivo
  en texto ("Model Card desactualizado hace 42 días", "Falta lineage.md").
- **R2.4** La card del dashboard muestra la salud del proyecto (la del **peor** modelo, para no
  esconder problemas en un promedio). El detalle muestra el desglose por modelo.
- **R2.5** El dashboard tiene una franja **"Requiere atención"** con los modelos en nivel atención
  o crítico, ordenados de peor a mejor, enlazados a su detalle.

### F3 — Linaje global
- **R3.1** Nueva página `/linaje`: grafo con tablas a un lado y modelos al otro (agrupados por
  proyecto), con una arista por cada tabla que usa un modelo.
- **R3.2** Al hacer clic en una tabla se resaltan los modelos que la usan y un panel lista el
  **impacto**: N modelos, M proyectos, cuántos en producción, con links al detalle.
- **R3.3** Al hacer clic en un modelo se resaltan sus tablas (dirección inversa).
- **R3.4** Hay un buscador de tabla por nombre. Las tablas del detalle de proyecto enlazan a
  `/linaje?tabla=<nombre>`.
- **R3.5** El grafo se deriva de `catalog.json` en build time. Sin datos nuevos ni fetch en cliente.

### F4 — Vista de portafolio
- **R4.1** Nueva página `/portafolio` con KPIs (proyectos, modelos, % saludables, modelos con drift,
  tablas distintas usadas).
- **R4.2** Matriz área × estado (conteo de proyectos por celda, clicable → dashboard filtrado).
- **R4.3** Ranking de salud por modelo (barras horizontales, peor arriba).
- **R4.4** Actividad reciente del portafolio: los últimos eventos (doc/release) de todos los
  proyectos, derivados del `historial` que ya existe.
- **R4.5** Se ve bien impresa o exportada a PDF desde el navegador (para comité).

### F5 — Profesionalización
- **R5.1** Tests (`pytest`) de las funciones puras del agregador (drift, salud, validación de
  config, extracción de resumen), corriendo en CI **antes** del build. Si fallan, no se publica.
- **R5.2** Al menos 4 proyectos demo con áreas, estados, salud y drift variados, y tablas
  compartidas entre proyectos (para que el linaje tenga impacto cruzado real que mostrar).
- **R5.3** README con capturas del dashboard, linaje y portafolio, más un guion de demo de 90 s.

## 5. Alternativas consideradas

- **Drift por "código vs. docs"** (último commit a `src/` vs. `docs/`): se descarta como señal
  principal. Un cambio de código no implica necesariamente un reentrenamiento, así que daría falsos
  positivos. `model_data.json` sí es la huella del entrenamiento: si cambió y la card no, el
  desfase es real.
- **Salud como promedio de modelos del proyecto:** se descarta. Un modelo crítico quedaría oculto
  detrás de dos sanos; se usa el peor.
- **Librería de grafos (Cytoscape, react-flow, d3-force):** se descarta por ahora. Un layout
  bipartito (tablas | modelos) es legible, determinista y cabe en SVG propio, igual que
  `ProgressRing` e `Icon`. Un layout de fuerzas "se ve más wow" pero se vuelve una maraña con
  30 o más nodos y cuesta más leerlo. Se revisa si el portafolio real supera unas 150 tablas.
- **Librería de charts para el portafolio:** mismo criterio. Barras y una matriz en SVG/CSS propio
  bastan; no se agrega dependencia.
- **Guardar snapshots para mostrar la evolución de la cobertura en el tiempo:** rompe ADR-001. Se
  usa solo lo que GitHub ya guarda (commits y tags).
- **No hacer nada:** el hub sigue siendo un tracker de docs y la demo issue → dashboard sigue rota.

## 6. ¿Agente LLM?

**No en este RFC.** Todo lo de F1–F5 es determinista y se deriva de metadata. El caso "preguntarle
al portafolio" es el candidato natural para un LLM. Cuando se aborde en su propio RFC, la opción
por defecto será Claude API directa sobre `catalog.json` (sin LangChain/LangGraph: no hay grafo de
estados). La narrativa del Model Card sigue en la skill de autodoc (Copilot), sin cambios.

## 7. Riesgos y mitigaciones

- **Más llamadas a la API de GitHub** (2 por modelo para las fechas de R2.1): al volumen del POC
  es trivial. Si escala, se usa GraphQL (una consulta por repo) sin cambiar el contrato.
- **Crear repos reales en GitHub** (demo E2E de R1.5 y datos de R5.2) es visible en la cuenta:
  todos privados en `luxitoppsai`, con datos ficticios. Se confirma antes de crearlos.
- **Romper los repos existentes al cambiar el template:** los repos ya creados no se tocan; solo
  cambia lo que se genera de ahí en adelante.
- **Umbrales de salud arbitrarios:** se declaran en un solo lugar (`aggregate.py`) y se muestran
  en la UI ("cómo se calcula"), para que sean discutibles y no mágicos.

## 8. Plan de entrega

Detalle en [`tasks.md`](./tasks.md). Orden: **F1 → F5 (tests) → F2 → F3 → F4 → F5 (demo/README)**.
El MVP demostrable es F1 + F2: ciclo cerrado más salud y drift visibles en el dashboard.

## 9. Criterios de aceptación

- [x] Un issue en el dispatcher crea un repo `coaa_*` multi-modelo y aparece en el dashboard
      publicado sin edición manual (R1.1–R1.5).
- [x] Un modelo cuyo `model_data.json` es más nuevo que su `model-card.md` muestra drift con los
      días correctos, y su puntaje de salud coincide con la tabla de R2.3 (verificado con test).
- [x] La franja "Requiere atención" lista exactamente los modelos con puntaje < 80.
- [x] En `/linaje`, clicar una tabla compartida entre dos proyectos resalta los modelos de ambos y
      el panel de impacto muestra conteos correctos.
- [x] `/portafolio` muestra KPIs coherentes con el dashboard y se imprime legible en A4.
- [x] `pytest` corre en CI antes del build; un test roto bloquea el deploy.
- [x] Todo verificado con Playwright (clics reales, ambos temas, cero errores de consola) en
      producción, siguiendo la lección de RFC-001 §11.

## 10. Bitácora de ejecución (2026-09-29)

Implementado completo y verificado en producción con Playwright (clics reales, ambos temas,
móvil, impresión a PDF y cero errores de consola). Hallazgos que no estaban en el plan:

- **El dispatcher nunca había corrido en Actions.** RFC-001 lo daba por probado, pero solo se
  había ejecutado en local. Tenía 4 fallas escondidas: el label del issue no existía, el runner no
  tiene `uvx`, el template privado no se podía clonar y faltaba el secret de `notify-hub`. Se
  corrigieron las 4 y el issue #1 creó `coaa_recomendador_de_seguros`, que apareció solo en Pages.
- **El workflow de deploy estaba deshabilitado por inactividad** (60 días sin commits), así que
  ignoraba el `repository_dispatch` sin avisar. Se rehabilitó.
- **Hidratación:** leer `?area=`/`?tabla=` en el primer render rompía la hidratación (React
  #418/#425), porque el HTML estático no conoce el query. Ahora se aplica tras hidratar.
- **Impresión:** con el tema oscuro por defecto, el PDF salía con títulos invisibles. Se agregó un
  bloque `@media print` con la paleta clara.
- **Se repitió el gotcha de `margin:auto` en un hijo flex** (RFC-001 §14) en la página nueva de
  linaje. Se detectó en la captura y se aplicó el patrón externo/interno.
- **Pendiente manual (Luis):** crear el secret `KC_DISPATCH_TOKEN` (fine-grained, acotado al hub)
  en el dispatcher.

## 11. Preguntas abiertas: cerradas el 2026-09-29

1. Pesos y umbrales de salud (R2.3): **aceptados tal cual**.
2. Repos demo viejos `kc-*`: **se archivan** (T05); los reemplazan demos nuevas (T14).
3. Acciones visibles en `luxitoppsai` (push a los repos del ecosistema, repos privados nuevos,
   issue en el dispatcher): **autorizadas**. Se informa cada una al ejecutarla.
