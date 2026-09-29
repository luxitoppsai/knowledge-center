# RFC-003 · Plan técnico

## 1. Agregador (`scripts/aggregate.py`)
- `calcular_salud(completitud, faltantes, tiene_card, drift, auc, n_tablas)`: recibe los docs
  faltantes para redactar el motivo como acción (R2). Los pesos no cambian.
- `intro_readme(md) -> str | None`: función pura. Descarta el `# título`, toma los bloques hasta el
  primer encabezado `##` y excluye bloques de código (R3). `resumen_proyecto()` la usa.
- `aviso_drift(md, drift, url_detalle) -> str`: función pura. Inserta un admonition
  `:::warning` después del frontmatter del `model-card.md` copiado (R4).
- Tests nuevos para las tres funciones y para los motivos.

## 2. Presentación compartida (`src/lib/`)
- `estado.js`: `ESTADOS` neutros ({label, icon}) para usar en dashboard, detalle y linaje (R1).
- `eventos.js`: `describirEvento(evento)` con reglas por prefijo convencional (R14).
- Componentes nuevos: `EstadoTag` (ícono + etiqueta neutros) y `DocGlifo` (● ◐ ○ en SVG).

## 3. Dashboard (`src/pages/index.js`)
- Encabezado compacto con KPIs (R5).
- `Atencion`: filas clicables completas con la acción (primer motivo) (R9).
- `Toolbar`: búsqueda `q`, chips `estado` y `salud` con conteo, selector de `area` y `orden`. Todo
  en la URL, leído tras hidratar (lección de RFC-002) (R7).
- `Card`: un `<a>` de overlay a la card completa; "Repositorio ↗" por encima con `z-index` (R8).
- Se elimina `ProgressRing` (sin otros usos).

## 4. Detalle (`src/components/ProjectDetail`)
- Se corrige `.page` con el patrón externo/interno (el mismo gotcha de `margin:auto`).
- `SaludModelos` arriba (R10). Modelos en `<details>`: todos abiertos si son ≤ 2; si no, solo el
  peor. El ancla `#modelo-x` abre su bloque (R11).
- Metadata en `<dl>` en línea y botón "Abrir Model Card" (R12).
- Histórico en `<details>` (R13). El resumen usa texto plano ya limpio del agregador.

## 5. Portafolio, docs y repos
- Actividad con `describirEvento` (R14). Aviso de "sin área" (R15).
- `docs/intro.md` reescrito (R16).
- Template: README sin texto de relleno. Repos demo: README sin relleno y `project.yaml` en
  `coaa_pyneg_demo_activos` (nombre legible y área).

## 6. Verificación
Build local, Playwright (scripts de RFC-002 actualizados + uno nuevo por criterio del §8), push y
repetición en producción.
