# Setup — qué necesita un repo de proyecto para aparecer en el Knowledge Center

Esta carpeta es la **referencia autocontenida**: todo lo que un repo de proyecto necesita para que
el hub lo descubra y lo publique. Si tu repo nació de `knowledge-center-template` (vía Cookiecutter o
el `knowledge-center-dispatcher`), ya trae todo esto — no tenés que hacer nada. Esta carpeta es para
cuando querés integrar un repo **existente** que no pasó por el template.

## El contrato, en una frase

> El hub descubre repos por **prefijo de nombre** (`kc-*`) y por **archivos en `docs/`** con nombres
> específicos. No hace falta que el repo de proyecto "sepa" que el hub existe — el hub jala.

## Checklist de integración

1. **El nombre del repo debe empezar con `kc-`** (configurable — ver `KC_PREFIX` en el hub).
   Ejemplo: `kc-mi-proyecto`.

2. **`model_data.json`** en la raíz del repo — metadata del modelo (algoritmo, hiperparámetros,
   features, métricas, linaje de tablas). Ver [`model_data.json.example`](./model_data.json.example)
   para el esquema completo. Es la fuente **determinista** de las cifras: el generador de Model
   Card nunca inventa un número que no esté acá.

3. **`docs/model-card.md`** — la ficha técnica del modelo. Se genera con la skill de autodoc
   (repo [`knowledge-center-autodoc`](https://github.com/luxitoppsai/knowledge-center-autodoc)) o
   se escribe a mano siguiendo [`docs-example/model-card.md`](./docs-example/model-card.md).
   **El frontmatter importa**: `id`, `title`, `sidebar_label` (sin emoji — se unifica con el resto
   del sitio), `sidebar_position: 1`.

4. **`docs/lineage.md`** (opcional pero cuenta para la completitud) — linaje de datos, con un
   diagrama Mermaid. Ver [`docs-example/lineage.md`](./docs-example/lineage.md).

5. **`docs/functions.md`** (opcional, cuenta para la completitud) — cómo interactúan las funciones
   del pipeline. Ver [`docs-example/functions.md`](./docs-example/functions.md).

6. **`project.yaml`** (opcional, recomendado) — manifest mínimo: nombre, área, tipo de modelo, owner.
   Ver [`project.yaml.example`](./project.yaml.example). **Solo campos que no cambian con el
   tiempo** — el estado y las métricas NO van acá, se derivan solos.

7. **`.github/workflows/notify-hub.yml`** (opcional, recomendado) — copiá
   [`notify-hub.yml`](./notify-hub.yml) a tu repo. Sin esto, el hub igual te descubre, pero solo
   en el rebuild programado (diario); con esto, el rebuild es casi instantáneo tras tu push a
   `develop`. Necesita el secret `KC_DISPATCH_TOKEN` (PAT con permiso de disparar workflows en el
   repo del hub) configurado en **tu** repo.

## ¿De dónde sale cada cosa que se muestra en el dashboard?

Esta es la pregunta que más se repite — la respuesta exacta, sin ambigüedad:

| Campo mostrado | De dónde sale (código real: `scripts/aggregate.py`) |
| --- | --- |
| **Completitud** (`33%`, `100%`...) | Cuenta cuántos de `{model-card.md, lineage.md, functions.md}` existen en `docs/` del repo, sobre 3. **No** depende de cuánto texto tengan — un archivo presente cuenta, esté completo o no. |
| **Estado** (Producción / Desarrollo / Nuevo) | **Producción** = el repo tiene al menos un *release* o *tag* en GitHub (`GET /releases/latest` o `/tags`). **Desarrollo** = no tiene release pero sí tiene algún doc en `docs/`. **Nuevo** = no tiene ni docs ni release. **No** se deriva de Pull Requests ni de branches — solo de tags/releases + presencia de docs. |
| **Algoritmo / AUC / features / tablas** | Directo de `model_data.json` (`models[0].algorithm_name`, la métrica `areaUnderROC`, `features.feature_count`, `sources.table_list`). |
| **"¿Qué es este proyecto?"** (resumen) | Las secciones `## Propósito y uso previsto` / `## Cómo funciona` de tu `model-card.md`. Si quedaron con el marcador `Por completar` de la skill de autodoc, el detalle no las muestra (no repite el placeholder) y en su lugar sugiere correr `/generar-model-card`. |
| **Histórico** (la timeline del detalle) | Commits que tocaron `docs/` (vía la API de commits, filtrado por `path=docs`) + tags/releases con su fecha. **No es un snapshot guardado** — se recalcula en cada build a partir de lo que GitHub ya tiene. |

Si querés cambiar alguna de estas reglas (por ejemplo, derivar "Producción" de un label del repo en
vez de releases), el lugar único para tocar es `scripts/aggregate.py` en este repo — está
comentado y son funciones cortas y aisladas (`historial()`, `tiene_release()`, `extraer_resumen()`).

## Probarlo localmente antes de esperar el build de CI

```bash
cd knowledge-center
pip install requests
export KC_OWNER=tu-usuario   # o export GITHUB_TOKEN=... si no tenés `gh` autenticado
python scripts/aggregate.py
npm run build && npm run serve
```
