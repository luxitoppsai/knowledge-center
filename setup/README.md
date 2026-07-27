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

2. **`config/mlops_config.json`** en la raíz del repo — lista los modelos del proyecto. Ver
   [`mlops_config.json.example`](./mlops_config.json.example). Formato:
   ```json
   { "models": [ { "name": "modelo_a", "version": "1" } ], "environments": [] }
   ```
   El `name` de cada entrada es el nombre exacto de la carpeta en `docs/` (`docs/<name>/`).

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

Si querés cambiar alguna de estas reglas (por ejemplo, derivar "Producción" de un label del repo en
vez de releases), el lugar único para tocar es `scripts/aggregate.py` en este repo — está
comentado y son funciones cortas y aisladas (`historial()`, `tiene_release()`, `extraer_resumen()`,
`procesar_modelo()`).

## Probarlo localmente antes de esperar el build de CI

```bash
cd knowledge-center
pip install requests
export KC_OWNER=tu-usuario           # o export GITHUB_TOKEN=... si no tenés `gh` autenticado
export KC_PREFIXES="coaa_,coeaa_"    # opcional — es el default
python scripts/aggregate.py
npm run build && npm run serve
```
