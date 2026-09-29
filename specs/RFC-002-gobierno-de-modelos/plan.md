# RFC-002 · Plan técnico

> Cómo se implementa [`spec.md`](./spec.md). Principio rector: **extender lo que existe**. Nada de
> capas nuevas, dependencias ni almacenamiento. Cada sección referencia los requisitos (R*) que cubre.

## 1. Agregador (`scripts/aggregate.py`), F2 + F5

### 1.1 Separar I/O de lógica (habilita tests, R5.1)
Hoy `_H` (headers con token) se calcula **al importar el módulo**, así que importarlo en un test
dispara `gh auth token`. Se vuelve perezoso con un `functools.cache` sobre `_headers()`. Las
funciones nuevas de F2 son **puras** (reciben fechas o dicts y devuelven dicts). El I/O se queda en
`procesar_modelo()`.

### 1.2 Fechas por archivo (R2.1)
```python
def fecha_ultimo_commit(full: str, path: str) -> str | None:
    """GET /repos/{full}/commits?path=<path>&per_page=1 (rama develop, fallback default)."""
```
Se llama 2 veces por modelo: `docs/<m>/model-card.md` y `docs/<m>/model_data.json`.

### 1.3 Drift y salud: funciones puras (R2.2, R2.3)
```python
def calcular_drift(fecha_card: str | None, fecha_metadata: str | None) -> dict | None:
    """None si no hay card o metadata, o si la card es igual o más nueva.
    Si no: {"dias": int, "fecha_card": ..., "fecha_metadata": ...}."""

def calcular_salud(completitud: int, tiene_card: bool, drift: dict | None,
                   auc: float | None, n_tablas: int) -> dict:
    """{"score": int, "nivel": "saludable"|"atencion"|"critico",
        "componentes": {"documentacion": n, "frescura": n, "desempeno": n, "linaje": n},
        "motivos": [str, ...]}"""
```
Pesos y umbrales como constantes de módulo (`PESOS_SALUD`, `UMBRALES_NIVEL`, `DRIFT_TOLERANCIA_DIAS
= 30`), en un solo lugar y visibles en la UI.

### 1.4 Esquema del catálogo (cambios aditivos, nada se rompe)
```diff
 modelo: { nombre, version, algoritmo, ..., completitud, sources, doc_url,
+          fechas: { card, metadata },
+          drift: { dias, fecha_card, fecha_metadata } | null,
+          salud: { score, nivel, componentes, motivos } }
 proyecto: { slug, ..., estado, historial, modelos,
+            salud: { score, nivel }   # = la del peor modelo (R2.4); null si 0 modelos
+          }
```

### 1.5 Tests (R5.1)
`tests/test_aggregate.py` con `pytest`: drift (card más nueva, más vieja, faltantes), salud (cada
componente, cada frontera de nivel 49/50/79/80), `leer_mlops_config` con `bajar` monkeypatcheado
(JSON inválido, sin `models`, modelo sin `name`), `extraer_resumen`. Sin llamadas de red.
`requirements-dev.txt` no hace falta: en CI basta `pip install requests pytest`.

## 2. Sitio (Docusaurus), F2–F4

### 2.1 Utilidades compartidas
`src/lib/salud.js`: el mapa `nivel → {label, clase de color}` y `peorModelo()`. Lo usan el
dashboard, el detalle y el portafolio, en vez de repetir el mapeo en tres lugares.

`src/lib/linaje.js`: una función pura `construirGrafo(catalog)` que devuelve
`{tablas: [{id, modelos:[...]}], modelos: [{id, proyecto, estado, tablas:[...]}], aristas}`. La
usan `/linaje` (el grafo) y `/portafolio` (el KPI "tablas distintas").

### 2.2 Dashboard (`src/pages/index.js`): R2.4, R2.5
- `Card`: se agrega `SaludBadge` (score + nivel) junto a la pill de estado. El anillo sigue
  mostrando la completitud (no se mezclan métricas en un mismo visual).
- Franja **"Requiere atención"** entre el hero y los filtros: lista compacta de modelos con nivel ≠
  saludable, con el motivo principal y un link al detalle (ancla `#modelo-<nombre>`). Si no hay
  ninguno, no se muestra (no hace falta un "todo bien" que ocupe espacio).
- El hero suma el stat "% modelos saludables".

### 2.3 Detalle (`src/components/ProjectDetail`): R2.4, R3.4
- Por modelo: bloque **Salud** con score, nivel, 4 barras de componentes (x/50, x/30, x/10, x/10)
  y la lista de motivos. Si hay drift, un aviso con fechas: "Model Card del 12-jun · metadata del
  24-jul · 42 días de atraso · corre `/generar-model-card`".
- Cada tabla del linaje enlaza a `/linaje?tabla=<nombre>`.
- `id="modelo-<nombre>"` en cada bloque de modelo, para que funcione el ancla de la franja de
  atención.

### 2.4 `/linaje` (`src/pages/linaje.js`): R3.1–R3.5
- **Layout bipartito determinista en SVG propio.** Columna izquierda: tablas ordenadas por número
  de modelos que las usan (las más críticas arriba). Columna derecha: modelos agrupados por
  proyecto. Aristas como curvas Bézier horizontales. Alto del SVG = `max(n_tablas, n_modelos) × fila`.
- **Estado de selección** en `useState`: `{tipo: 'tabla'|'modelo', id}`. Lo seleccionado y sus
  vecinos quedan a opacidad 1 y el resto baja a 0.15. Se sincroniza con `?tabla=` en la URL
  (`useLocation` + `history.replace`) para que el link desde el detalle aterrice ya seleccionado.
- **Panel de impacto** (a la derecha en desktop, debajo en móvil): conteos (modelos, proyectos, en
  producción, con salud crítica) y una lista con links a `/proyecto/<slug>#modelo-<m>`.
- **Buscador**: `<input>` con filtro por substring sobre nombres de tabla; Enter selecciona la
  primera coincidencia.
- Nodos navegables con teclado (`tabIndex`, Enter/Espacio seleccionan). Etiquetas largas
  (`catalog.esquema.tabla`) se muestran como `esquema.tabla` con el nombre completo en `<title>`.
- **Móvil (< 700px):** el grafo no cabe legible. Se muestra una lista de tablas → modelos (misma
  interacción, sin aristas).

### 2.5 `/portafolio` (`src/pages/portafolio.js`): R4.1–R4.5
Diseño según la skill `dataviz` (se lee **antes** de escribir el primer chart).
- Fila de KPIs (stat tiles).
- **Matriz área × estado:** grilla CSS con celdas coloreadas por conteo (escala secuencial de un
  solo tono). Cada celda enlaza a `/?area=<a>&estado=<e>`, por lo que el dashboard pasa a leer sus
  filtros desde la query string (cambio chico que además permite compartir vistas filtradas).
- **Ranking de salud:** barras horizontales SVG, una por modelo, coloreadas por nivel y con el
  peor arriba.
- **Actividad reciente:** los últimos 15 eventos de `historial` de todos los proyectos, como
  timeline vertical.
- `@media print`: se ocultan la navbar, el footer y el toggle de tema; fondo blanco; se evita
  cortar tarjetas entre páginas (`break-inside: avoid`).

### 2.6 Navegación
La navbar suma **Portafolio** y **Linaje** (`docusaurus.config.js`).

## 3. Ecosistema (otros repos), F1

### 3.1 `knowledge-center-template`: R1.1–R1.3
```
{{cookiecutter.repo_name}}/
  config/mlops_config.json           # {"models":[{"name":"{{cookiecutter.modelo_inicial}}","version":"1"}],"environments":[]}
  docs/{{cookiecutter.modelo_inicial}}/model_data.json
  project.yaml, README.md, autodoc/, .github/...
```
- `cookiecutter.json`: `prefijo: ["coaa_", "coeaa_"]`, `nombre_corto` (snake), `repo_name =
  prefijo + nombre_corto`, `modelo_inicial` (default `modelo_ejemplo`).
- Se elimina `model_data.json` de la raíz.
- `notify-hub.yml` → `paths` suma `config/**`.

### 3.2 `knowledge-center-autodoc` (+ copia en el template): R1.4
- `model_card.py`: se agrega `--modelo`. Las rutas pasan a `docs/<m>/`. Sin argumento, itera
  `config/mlops_config.json`.
- `.github/prompts/generar-model-card.prompt.md` y `model-card-writer.agent.md`: instrucciones para
  trabajar por modelo (`docs/<m>/*.md`).
- Se sincroniza la copia del template (hoy son idénticas; se mantiene así).

### 3.3 `knowledge-center-dispatcher`: R1.2, R1.5
- Issue form: se agregan el dropdown **Prefijo** (`coaa_`/`coeaa_`) y **Nombre del primer modelo**.
- `crear_proyecto.py`: `full_name = f"luxitoppsai/{repo_name}"` (sin `kc-`), y se pasan las nuevas
  variables a cookiecutter. `_slug()` pasa a producir snake_case.

## 4. CI (`.github/workflows/deploy.yml`): R5.1
Se agrega el paso `pip install requests pytest && pytest -q` **antes** de "Agregar catálogo". Si
falla, el job se corta y no hay deploy.

## 5. Verificación
Por cada fase se hace un build local y Playwright con clics reales en ambos temas (dashboard →
detalle → linaje → portafolio), mirando la consola. Al cerrar cada fase se repite en producción.
Lección vigente de RFC-001 §11 y §13: `curl` no basta, y hay que verificar la rama que el pipeline
**lee** (`develop`).
