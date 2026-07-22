---
type: rfc
proyecto: "knowledge-center"
rfc: RFC-001
estado: aceptado
fecha: 2026-07-21
fecha_aceptado: 2026-07-21
tags: [rfc, contrato]
---

# RFC-001 — Knowledge Center: hub de documentación de modelos

> Construido en modo CTO / carta libre (Luis delegó decisión y ejecución). Documentado post-hoc
> para dejar registro del contrato — el patrón de "RFC antes de código" se preserva como huella,
> aunque aquí la construcción fue autónoma y luego revisada.

## 1. Contexto y problema

Los repos de modelos del COE nacen sin estandarizar, documentan de forma dispersa, y no hay un
lugar único para ver qué proyectos existen, su estado y qué tan documentados están. Se necesita un
**POC real** (cuenta personal `luxitoppsai`, datos de ejemplo) que pruebe: creación estandarizada de
repos (Cookiecutter + dispatcher por issue), autodocumentación (Model Card desde metadata + linaje +
funciones), y un **hub central** (Docusaurus, diseño corporativo-futurista) con dashboard de métricas.

## 2. Objetivo

Un ecosistema de 3 repos que demuestre el ciclo completo: **issue → repo de proyecto → doc
autogenerada → hub que la descubre y publica un dashboard**, sin pasos manuales entre piezas.
"Hecho" = un repo nuevo creado por el dispatcher aparece solo en el dashboard publicado en Pages.

## 3. Alcance

- **Dentro:** template Cookiecutter; dispatcher (issue→repo); generador de Model Card desde
  `model_data.json` (determinista + narrativa); hub Docusaurus con dashboard (filtros, semáforo de
  estado, barra de completitud) publicado en GitHub Pages; agregación automática vía CI.
- **Fuera:** datos reales del BCP (todo es data de ejemplo); Skill de VSCode instalable (se entrega
  el generador subyacente, no el empaquetado de extensión); autenticación/roles en el dashboard;
  sincronización en tiempo real (se resuelve por rebuild, con push+schedule+manual).

## 4. Propuesta — arquitectura de "vista computada"

**Decisión central:** el hub **no almacena** documentación. Cada build:
1. Descubre repos `kc-*` de la cuenta (vía `/user/repos`, incluye privados).
2. Trae sus `docs/*.md` a `docs/<slug>/` (insumo **temporal**, gitignored).
3. **Deriva** el catálogo (completitud, estado, métricas) de lo que encuentra — no de un archivo
   mantenido a mano. Estado por tags/releases; completitud = cuántos de los 3 docs esperados existen.
4. Construye Docusaurus (dashboard = landing, cada proyecto = sección) y publica en Pages.

Esto resuelve dos preguntas abiertas del refinamiento: (a) no hace falta "empujar" copias de docs al
central — se leen frescas en cada build; (b) el estado no se llena a mano al crear el repo — se
descubre solo, con lo que exista en cada rebuild.

**Repos del ecosistema:**
- `knowledge-center-template` — Cookiecutter (`project.yaml` manifest mínimo, `model_data.json`,
  `docs/`, `notify-hub.yml` con `repository_dispatch`).
- `knowledge-center-dispatcher` — issue-form → `crear_proyecto.py` → repo nuevo (`main`+`develop`).
- `knowledge-center` — agregación (`scripts/aggregate.py`) + Docusaurus (tema custom, dashboard React)
  + workflow de deploy (dispatch/push/schedule → Pages).
- `kc-scoring-admision-pyme`, `kc-churn-de-tarjetas`, `kc-deteccion-de-fraude-tarjetas` — demos,
  el tercero generado en vivo por el dispatcher.

## 5. Alternativas consideradas

- **Almacenar copias de docs en el central** (push directo): descartado — duplica fuente de verdad,
  se desincroniza. La vista computada evita esto por diseño.
- **`project.yaml` como fuente de estado**: descartado — se llenaría a mano y quedaría desactualizado;
  el estado se deriva de señales vivas del repo (tags, docs presentes).
- **Un sitio Docusaurus por proyecto**: descartado por Luis — un sitio único con secciones es más
  simple de operar y da un dashboard/buscador unificado.
- **Servicio tercero de agregación**: no evaluado, KISS con GitHub Actions + script propio alcanza.

## 6. ¿Agente LLM?

**No aplica en el POC actual.** El generador de Model Card es determinista + secciones narrativas
pasadas como parámetro (para el POC, texto de ejemplo). La versión real como **skill de VSCode con
tools** (que resuelva la narrativa con un LLM llamando a Copilot) es el siguiente hito, siguiendo el
mismo patrón ya usado en `coaa-autodoc-kit`.

## 7. Riesgos y mitigaciones

- **Token con alcance amplio** (`KC_READ_TOKEN`, `KC_CREATE_TOKEN`): son PATs personales de Luis
  guardados como secrets de repo, aceptable para un POC en cuenta propia; en un entorno corporativo
  se reemplazan por GitHub App con permisos acotados.
- **Inyección de comandos vía cuerpo de issue**: mitigado — el cuerpo se pasa por variable de
  entorno (`env:`), nunca interpolado directo en un `run:` (vulnerabilidad clásica de Actions).
- **GitHub Pages requiere repo público** en cuenta free: `knowledge-center` es público (solo data de
  ejemplo); los repos de proyecto (`kc-*`) siguen privados.
- **Rate limits de la API de GitHub**: no crítico al volumen del POC; a futuro, cachear o paginar con cuidado.

## 8. Plan de entrega (todo H1, ejecutado en una sesión)

- Template Cookiecutter — ✅ probado (genera repo válido, expresiones de Actions preservadas).
- 2 repos demo con metadata distinta — ✅ (uno 100%/producción, otro 33%/desarrollo, por diseño).
- Generador de Model Card (determinista + narrativa) — ✅ probado contra ambos.
- Hub Docusaurus (tema futurista, dashboard, agregación) — ✅ build local + **deploy real a Pages
  verificado en producción** (https://luxitoppsai.github.io/knowledge-center/).
- Dispatcher (issue→repo) — ✅ probado creando un 3er repo real; el hub lo descubrió solo al reagregar.

## 9. Criterios de aceptación

- [x] El template genera un repo con las variables sustituidas correctamente.
- [x] El dispatcher parsea un issue-form real y crea un repo (`main`+`develop`) en GitHub.
- [x] El Model Card se genera desde `model_data.json` sin inventar cifras (AUC, hiperparámetros,
      features, linaje extraídos verbatim).
- [x] El dashboard publicado en Pages muestra métricas correctas (completitud, estado, AUC) y enlaza
      a la doc y al repo.
- [x] Un repo nuevo aparece en el dashboard sin edición manual del catálogo, tras un rebuild.
- [x] Ningún secreto en el código; el cuerpo de issue no se interpola en shell.

## 10. Siguientes pasos (fuera de este RFC)

- ~~Empaquetar el generador de Model Card como skill real de VSCode~~ ✅ **hecho** —
  `knowledge-center-autodoc` (repo propio): `autodoc/model_card.py` (determinista, con
  `secciones_pendientes()` para que el agente sepa qué narrativa falta), prompt file
  `/generar-model-card`, custom agent `model-card-writer` (tools: codebase/search/edit/runCommands,
  solo toca `docs/*.md`). **Incluida de fábrica en el template Cookiecutter** — todo repo nuevo la
  trae sin copiar nada a mano. Sincronizada también en los 2 repos demo existentes.
- ~~Página de detalle de repo con más profundidad (histórico)~~ ✅ **hecho** — ruta
  `/proyecto/<slug>` (plugin Docusaurus, datos horneados en build, sin fetch en cliente). Métricas,
  checklist de docs esperados vs. presentes, linaje (tablas+columnas), y **histórico derivado sin
  snapshots**: `historial()` combina commits a `docs/` (progreso de documentación) + tags/releases
  (hitos de madurez) leídos de la API de GitHub en cada build — coherente con el patrón de vista
  computada, no requiere base de datos. Verificado en producción para los 3 estados (100%/33%/0%).
- Si escala a más repos: mover de PAT personal a GitHub App con permisos mínimos.

## 11. Bug crítico cazado y corregido post-lanzamiento (2026-07-22)

Al probar el detalle con **clics reales** (Playwright headless, no `curl`), se encontró que
`/proyecto/<slug>` daba **"Página No Encontrada"** al navegar por SPA (aunque una carga directa
por URL sí funcionaba — por eso las pruebas con `curl` no lo habían detectado). Causa raíz: el
plugin `project-pages` registraba las rutas sin el `baseUrl` del sitio; el build estático coincidía
por casualidad con la estructura de `outDir`, pero React Router (cliente) no reconocía la ruta.
Corregido con `normalizeUrl([baseUrl, 'proyecto', slug])`. Re-verificado con clics reales contra
producción: los 3 proyectos navegan sin error.

De paso: se agregó **tema claro** (mismo acento, tokens theme-aware, toggle ya existente ahora
funciona en ambos sentidos), se hizo **navegable el checklist de documentación** (antes solo
mostraba ✓/○ sin poder ir al documento — bug real: el componente nunca recibía el `slug`), y se
corrigió un overflow de texto en las tarjetas de métricas.

**Lección operativa:** para verificar sitios SPA, `curl`/lectura de HTML estático **no basta** —
hay que probar con un navegador real ejecutando JS y clics, porque el HTML server-rendered puede
verse perfecto mientras la navegación cliente falla silenciosamente.

## 12. Resumen narrativo del proyecto en el detalle (2026-07-22)

El detalle mostraba métricas e histórico pero no respondía "¿qué es este proyecto?". Se agregó una
sección que **reutiliza** la narrativa que ya escribe la skill de autodoc (`model-card.md` →
secciones "Propósito y uso previsto" / "Cómo funciona"), extraída determinísticamente en
`aggregate.py::extraer_resumen()` — nunca inventa: si la sección quedó con el marcador
`Por completar`, se omite y el detalle muestra una guía para correr `/generar-model-card`. De paso
se corrigió que el markdown inline (`**negrita**`) se mostraba literal (con asteriscos) al
renderizarse como texto plano en el componente React; se agregó un mini-parser inline en vez de
traer una librería de markdown completa. Verificado en producción con clic real (Playwright) en
los 3 estados: narrativa completa, parcial, y vacía.

## 13. Auditoría UX/UI (2026-07-22)

Con sombrero de diseño puesto, auditoría honesta con evidencia (screenshots reales, no memoria):
el sitio se leía como "SaaS de IA genérico" — gradiente cyan-violeta en absolutamente todo sin
jerarquía, emoji como iconos, grid de fondo cliché en el hero, tipografía que "declaraba" Inter
pero nunca se cargó (caía a system font), y el Model Card (Docusaurus stock) sin ninguna relación
visual con el dashboard custom.

**Correcciones aplicadas:**
- **Tipografía con intención**: Sora (display, geométrica) vía `--ifm-heading-font-family` — se
  propaga automáticamente al Model Card, unificando ambas superficies sin tocar cada página.
  JetBrains Mono para datos. system-ui honesto para cuerpo (decisión real, no una que nunca se
  ejecutó).
- **Disciplina de gradiente**: reservado a un solo momento (CTA); números de stats, barra de
  progreso y métricas del detalle pasan a color sólido.
- **Icon component propio** (SVG trazo) reemplaza los emoji en toda la superficie custom.
  `sidebar_label` sin emoji en los docs — propagado a los 4 repos del ecosistema.
- **Model Card unificado**: admonitions, sidebar activo, TOC activo y paginación con los tokens
  de marca en vez de los colores de fábrica de Docusaurus.
- Hero sin grid de fondo, radios de borde más ajustados, contraste del track de progreso corregido
  en claro.
- **Por pedido de Luis**: se retiró el concepto "cerebro de los modelos" — el hero volvió a ser
  "Knowledge Center" simple.

**Bug real cazado durante la verificación**: el fix de `sidebar_label` no se reflejaba en
producción pese a estar pusheado — causa raíz: `aggregate.py` prioriza la rama `develop` (por
diseño, ahí llega el flujo PR-a-develop) pero el fix solo se había pusheado a `main`; `develop`
seguía con el contenido viejo. Corregido sincronizando `develop ← main` en los repos afectados.
Lección: en un sistema con dos ramas relevantes, **verificar siempre la rama que el pipeline
realmente lee**, no la que se pusheó.

Todo verificado con Playwright (clics reales) en producción tras cada cambio, cero errores de
consola en el estado final.

## 14. Grilla real + métricas más visuales + documentación (2026-07-22)

Luis preguntó por replicar el sistema, lo que llevó a documentar el "enlace" entre repos con
precisión (§ver README/setup), y de paso pidió hacer la grilla del dashboard más robusta con más
proyectos y las métricas más visuales.

**Bug crítico real cazado al simular 8 proyectos** (no evidente con solo 3): la grilla renderizaba
en **una sola columna** sin importar el viewport. Causa raíz confirmada midiendo
`getComputedStyle` real (no por captura): `.main` es hijo directo de un contenedor
`display:flex; flex-direction:column` (el `mainWrapper` de Docusaurus). La regla
`.main{max-width:1100px; margin:0 auto}` desactivaba el `align-items:stretch` por defecto — un
`margin:auto` en el eje cruzado de un hijo flex anula el stretch, y el ancho pasa a calcularse por
contenido (shrink-to-fit), colapsando el `grid-template-columns: repeat(auto-fill, minmax(300px,1fr))`
a un solo track. Mismo patrón que ya usaba `.hero`/`.heroInner` (que sí funcionaba) aplicado ahora a
`.main`/`.mainInner`: el hijo flex se estira full-width sin margen, el centrado real vive en un div
interno. Verificado con 8 proyectos simulados: ahora renderiza 4 columnas reales.

**Métricas más visuales**: `ProgressRing` (anillo SVG con % adentro, coloreado según estado)
reemplaza la barra fina de completitud. El estado pasa de "punto + texto" a una **pill** con fondo
tintado — más peso visual, patrón estándar de badge de status.

**Documentación agregada**:
- `README.md`: qué es, diagrama de arquitectura (mermaid), los 4 disparadores del rebuild, tabla
  exacta de "de dónde sale cada dato" (completitud = archivos presentes en `docs/`; estado =
  tags/releases de GitHub, **no** PRs; métricas = `model_data.json`; histórico = commits a `docs/`
  + tags, sin snapshots).
- `CONTRIBUTING.md`: setup, flujos comunes, y **por qué hay que verificar con Playwright/clicks
  reales** (no alcanza con `curl` — ya mordió antes), más las convenciones de diseño que no hay
  que romper (el gotcha de `margin:auto` en flex column, disciplina de gradiente, iconos propios).
- `setup/`: referencia autocontenida para integrar un repo de proyecto sin pasar por el template
  (`notify-hub.yml` listo para copiar + ejemplos de `model_data.json`/`project.yaml`/docs).
- `RFC.md` (este archivo) copiado al repo — antes solo vivía local, el README lo referenciaba con
  un link roto entre repos distintos.

Todo verificado con Playwright (clics reales) en producción: grid de 4 columnas con 8 proyectos
simulados, 3 columnas reales con los 3 proyectos reales, cero errores de consola.
