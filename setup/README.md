# Setup — qué necesita un repo de proyecto para aparecer en el Knowledge Center

Esta carpeta es la **referencia autocontenida**: todo lo que un repo de proyecto necesita para que
el hub lo descubra y lo publique. Si tu repo nació de `knowledge-center-template` (vía Cookiecutter o
el `knowledge-center-dispatcher`), ya trae todo esto — no tenés que hacer nada. Esta carpeta es para
cuando querés integrar un repo **existente** que no pasó por el template.

## El contrato, en una frase

> El hub descubre repos por **prefijo de nombre** (`coaa_*` / `coeaa_*`) y por **archivos en
> `docs/<nombre_modelo>/`** con nombres específicos. Un repo es un **proyecto**, y un proyecto
> puede tener **varios modelos** — cada uno con su propia documentación. No hace falta que el
> repo de proyecto "sepa" que el hub existe — el hub jala.

## Un proyecto, N modelos

```
mi-repo-de-proyecto/
  README.md                       # describe el PROYECTO (no un modelo específico)
  project.yaml                     # opcional: nombre, área, owner
  config/
    mlops_config.json              # lista los modelos del proyecto (nombre + versión)
  docs/
    modelo_a/
      model-card.md
      lineage.md
      functions.md
      model_data.json
    modelo_b/
      model-card.md
      model_data.json
      # (lineage.md y functions.md son opcionales por modelo — cuentan para SU completitud)
```

Cada modelo se documenta **por separado**, en su propia carpeta `docs/<nombre_modelo>/`. La
completitud, el algoritmo, el AUC, las features y las tablas fuente se calculan **por modelo** —
un modelo 100% documentado y otro sin empezar conviven en el mismo repo sin problema.

## Checklist de integración

1. **El nombre del repo debe empezar con `coaa_` o `coeaa_`** (configurable — ver `KC_PREFIXES`
   en el hub, lista separada por comas). El nombre completo se muestra tal cual en el dashboard —
   el hub **no** recorta el prefijo. Ejemplo: `coaa_mi_proyecto`.

2. **`config/mlops_config.json`** en la raíz del repo — lista los modelos del proyecto. Ver el
   **esquema exacto** más abajo y [`mlops_config.json.example`](./mlops_config.json.example).

3. **Por cada modelo listado, `docs/<nombre_modelo>/model_data.json`** — metadata del modelo
   (algoritmo, hiperparámetros, features, métricas, linaje de tablas). Ver
   [`docs-example/modelo_ejemplo/model_data.json.example`](./docs-example/modelo_ejemplo/model_data.json.example)
   para el esquema completo. Es la fuente **determinista** de las cifras: el generador de Model
   Card nunca inventa un número que no esté acá.

4. **`docs/<nombre_modelo>/model-card.md`** — la ficha técnica de ESE modelo. Se genera con la
   skill de autodoc (repo [`knowledge-center-autodoc`](https://github.com/luxitoppsai/knowledge-center-autodoc))
   o se escribe a mano siguiendo [`docs-example/modelo_ejemplo/model-card.md`](./docs-example/modelo_ejemplo/model-card.md).
   **El frontmatter importa**: `id`, `title`, `sidebar_label` (sin emoji — se unifica con el resto
   del sitio), `sidebar_position: 1`.

5. **`docs/<nombre_modelo>/lineage.md`** (opcional, cuenta para la completitud de ESE modelo) —
   linaje de datos, con un diagrama Mermaid. Ver
   [`docs-example/modelo_ejemplo/lineage.md`](./docs-example/modelo_ejemplo/lineage.md).

6. **`docs/<nombre_modelo>/functions.md`** (opcional, cuenta para la completitud de ESE modelo) —
   cómo interactúan las funciones del pipeline. Ver
   [`docs-example/modelo_ejemplo/functions.md`](./docs-example/modelo_ejemplo/functions.md).

7. **`README.md`** (o `README_info.md`) en la raíz del repo — describe el **proyecto**: qué
   problema resuelve, qué segmentos/modelos corre y por qué están agrupados. Es texto libre; el
   detalle del hub lo muestra tal cual bajo "¿Qué es este proyecto?". **No** es el lugar para
   describir un modelo específico — eso vive en su propio `model-card.md`.

8. **`project.yaml`** (opcional, recomendado) — manifest mínimo: nombre, área, owner. Ver
   [`project.yaml.example`](./project.yaml.example). **Solo campos que no cambian con el
   tiempo** — el estado y las métricas NO van acá, se derivan solos.

9. **`.github/workflows/notify-hub.yml`** (opcional, recomendado) — copiá
   [`notify-hub.yml`](./notify-hub.yml) a tu repo. Sin esto, el hub igual te descubre, pero solo
   en el rebuild programado (diario); con esto, el rebuild es casi instantáneo tras tu push a
   `develop`. Necesita el secret `KC_DISPATCH_TOKEN` (PAT con permiso de disparar workflows en el
   repo del hub) configurado en **tu** repo.

## Esquema exacto de `config/mlops_config.json`

Este archivo es el punto de entrada de todo el resto (qué modelos tiene el proyecto, dónde buscar
su documentación). Sin un contrato explícito, cada equipo termina escribiéndolo distinto — este es
el esquema fijo, sin ambigüedad:

```json
{
  "models": [
    { "name": "fv_RandomForestSet_bestModel", "version": "1" },
    { "name": "mp_LogisticRegression_bestModel", "version": "1" }
  ],
  "environments": []
}
```

| Campo | Tipo | Obligatorio | Qué significa |
| --- | --- | --- | --- |
| `models` | array de objetos | **Sí** | Un objeto por modelo del proyecto. Si falta esta clave, el hub trata al proyecto como si no tuviera modelos (0 modelos, no rompe el build, pero avisa por log). |
| `models[].name` | string | **Sí** | Nombre exacto de la carpeta en `docs/` (`docs/<name>/`). Si falta o es vacío, ESE modelo se descarta (no aparece en el dashboard) — el hub no puede adivinar a qué carpeta corresponde. |
| `models[].version` | string | Recomendado | Versión del modelo, se muestra en el detalle (`v1`, `v2`...). Si falta, el modelo igual se documenta, solo no se muestra versión. |
| `environments` | array | No | Reservado para uso futuro (p. ej. distinguir despliegues dev/staging/prod). El hub no lo lee todavía — si tu proyecto no lo necesita, dejalo como `[]`. |

**Reglas de escritura** (para que no se vuelva "lo que cada quien quiera poner"):
- No inventes claves alternativas (`model_name`, `ver`, `modelos`, etc.) — el hub busca exactamente
  `models`, `name`, `version`. Un typo no rompe el build, pero hace que el modelo desaparezca en
  silencio del dashboard hasta que alguien note el log de advertencia.
- El orden de los modelos en el array es el orden en que se muestran en el detalle del proyecto.
- No agregues campos propios al objeto de cada modelo salvo que también actualices
  `scripts/aggregate.py` para leerlos — si no, quedan ahí sin efecto y confunden a quien lea el
  archivo después.

`scripts/aggregate.py::leer_mlops_config()` valida esto en cada build: si el JSON es inválido, si
falta `models`, o si un modelo no trae `name`, lo dice explícitamente en el log del workflow en vez
de fallar en silencio.

## ¿De dónde sale cada cosa que se muestra en el dashboard?

Esta es la pregunta que más se repite — la respuesta exacta, sin ambigüedad:

| Campo mostrado | Nivel | De dónde sale (código real: `scripts/aggregate.py`) |
| --- | --- | --- |
| **Nombre del proyecto** | Proyecto | Nombre completo del repo (con prefijo `coaa_`/`coeaa_` incluido) o `project.yaml: name` si existe. |
| **"¿Qué es este proyecto?"** | Proyecto | El `README.md`/`README_info.md` raíz del repo, tal cual (se omite el `# título` inicial porque ya se muestra como encabezado de la página). |
| **N modelos / X con doc completa** | Proyecto | Cuenta las entradas de `config/mlops_config.json` y cuántas de ellas llegan a 100% de completitud. |
| **Estado** (Producción / Desarrollo / Nuevo) | Proyecto | **Producción** = el repo tiene al menos un *release* o *tag* en GitHub. **Desarrollo** = no tiene release pero al menos un modelo tiene algún doc en su carpeta. **Nuevo** = ningún modelo tiene docs y no hay release. **No** se deriva de Pull Requests ni de branches. |
| **Histórico** (la timeline del detalle) | Proyecto | Commits que tocaron `docs/` (vía la API de commits, filtrado por `path=docs`) + tags/releases con su fecha. **No es un snapshot guardado** — se recalcula en cada build. |
| **Completitud de un modelo** (`33%`, `100%`...) | Modelo | Cuenta cuántos de `{model-card.md, lineage.md, functions.md}` existen en `docs/<nombre_modelo>/`, sobre 3. **No** depende de cuánto texto tengan — un archivo presente cuenta, esté completo o no. |
| **Algoritmo / AUC / features / tablas de un modelo** | Modelo | Directo de `docs/<nombre_modelo>/model_data.json` (`models[0].algorithm_name`, la métrica `areaUnderROC`, `features.feature_count`, `sources.table_list`). |
| **Narrativa de un modelo** (propósito / cómo funciona) | Modelo | Las secciones `## Propósito y uso previsto` / `## Cómo funciona` de `docs/<nombre_modelo>/model-card.md`. Si quedaron con el marcador `Por completar` de la skill de autodoc, el detalle no las muestra (no repite el placeholder). |
| **Doc drift de un modelo** | Modelo | Fecha del último commit a `docs/<nombre_modelo>/model_data.json` vs. el último commit a `docs/<nombre_modelo>/model-card.md` (rama `develop`, si no la por defecto). Si la metadata es más nueva, hay drift y se reporta con los días de atraso. Por eso, **al reentrenar, regenera el Model Card** (`/generar-model-card`). |
| **Salud de un modelo** (0–100) | Modelo | Documentación 50 (completitud × 0.5) + Frescura 30 (sin drift 30, drift ≤ 30 días 15, más o sin card 0) + Desempeño 10 (hay AUC) + Linaje 10 (hay `table_list`). Saludable ≥ 80, Atención 50–79, Crítico < 50. |
| **Salud de un proyecto** | Proyecto | La del **peor** de sus modelos (un promedio escondería al modelo crítico). |
| **Linaje global / impacto** (`/linaje`) | Portafolio | Cruza el `sources.table_list` de todos los modelos: una tabla "compartida" es la que aparece en modelos de más de un proyecto. |

Si querés cambiar alguna de estas reglas (por ejemplo, derivar "Producción" de un label del repo en
vez de releases), el lugar único para tocar es `scripts/aggregate.py` en este repo — está
comentado y son funciones cortas y aisladas (`historial()`, `tiene_release()`, `extraer_resumen()`,
`procesar_modelo()`, `calcular_drift()`, `calcular_salud()`; pesos y umbrales en `PESOS_SALUD` y
constantes vecinas).

## Probarlo localmente antes de esperar el build de CI

```bash
cd knowledge-center
pip install requests
export KC_OWNER=tu-usuario           # o export GITHUB_TOKEN=... si no tenés `gh` autenticado
export KC_PREFIXES="coaa_,coeaa_"    # opcional — es el default
python scripts/aggregate.py
npm run build && npm run serve
```
