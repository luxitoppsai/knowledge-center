# RFC-002 · Tareas

> Orden de ejecución de [`plan.md`](./plan.md). Cada tarea: requisitos que cubre, qué se entrega y
> cómo se verifica. `[ ]` pendiente · `[~]` en curso · `[x]` hecha. 🔒 = acción visible fuera del
> repo local (push, crear repos); se confirma antes.

## Fase 1 — Cerrar el ciclo (MVP, parte 1)

- [ ] **T01 · Template multi-modelo** (R1.1–R1.3) · repo `knowledge-center-template`
  - `cookiecutter.json` con `prefijo`, `nombre_corto`, `repo_name`, `modelo_inicial`.
  - Genera `config/mlops_config.json` + `docs/<modelo_inicial>/model_data.json`; se quita
    `model_data.json` de la raíz; `notify-hub.yml` vigila `config/**`.
  - ✅ Verificar: `uvx cookiecutter --no-input . prefijo=coaa_ nombre_corto=demo_x` en el
    scratchpad → la estructura coincide con `setup/README.md` del hub.

- [ ] **T02 · Autodoc por modelo** (R1.4) · repo `knowledge-center-autodoc` + copia en el template
  - `model_card.py --modelo <m>`; sin argumento itera la config. Prompt y agent actualizados.
  - ✅ Verificar: contra una copia local de `coaa_pyneg_demo_activos` genera
    `docs/<m>/model-card.md` para los 3 modelos, sin inventar cifras (se compara con
    `model_data.json`).

- [ ] **T03 · Dispatcher al esquema nuevo** (R1.2) · repo `knowledge-center-dispatcher`
  - Issue form con Prefijo y Primer modelo; `crear_proyecto.py` sin `kc-`; slug en snake_case.
  - ✅ Verificar: `parsear_issue()` con un cuerpo real de issue-form, y
    `crear_repo()` en seco hasta antes de `gh repo create`.

- [ ] **T04 · 🔒 Push de T01–T03 + demo E2E** (R1.5)
  - Push a los 3 repos. Abrir un issue real → se crea `coaa_<algo>` → rebuild → aparece en Pages.
  - ✅ Verificar: Playwright en producción; el proyecto nuevo es visible y navegable.

- [ ] **T05 · 🔒 Retirar demos `kc-*`** (pregunta abierta 2)
  - `gh repo archive` de los 3 repos `kc-*` y actualización de la nota del vault.

## Fase 2 — Base de calidad

- [ ] **T06 · Agregador testeable + tests** (R5.1)
  - Headers perezosos (`_headers()` con cache). `tests/test_aggregate.py` para
    `leer_mlops_config` y `extraer_resumen`.
  - ✅ Verificar: `pytest -q` en verde sin red ni token.

- [ ] **T07 · Tests en CI** (R5.1)
  - Paso `pytest` antes de agregar en `deploy.yml`.
  - ✅ Verificar: rompiendo un test a propósito en una rama, el workflow falla antes del build.

## Fase 3 — Salud y drift (MVP, parte 2)

- [ ] **T08 · Drift y salud en el agregador** (R2.1–R2.3)
  - `fecha_ultimo_commit`, `calcular_drift`, `calcular_salud` + constantes; se amplía el esquema
    del catálogo (plan §1.4). Tests de cada componente y de las fronteras de nivel.
  - ✅ Verificar: `pytest` en verde. `aggregate.py` real contra la cuenta: los valores de
    `coaa_pyneg_demo_activos` coinciden con un cálculo a mano.

- [ ] **T09 · Salud en el dashboard** (R2.4, R2.5)
  - `src/lib/salud.js`, `SaludBadge` en la card, franja "Requiere atención", stat "% saludables".
  - ✅ Verificar: Playwright; la franja lista exactamente los modelos con score < 80; los links
    aterrizan en el bloque del modelo (ancla).

- [ ] **T10 · Salud en el detalle** (R2.4)
  - Bloque de salud por modelo (barras de componentes, motivos, aviso de drift) + anclas
    `#modelo-<m>`.
  - ✅ Verificar: Playwright en ambos temas; un modelo con drift muestra fechas y días correctos.

## Fase 4 — Linaje global

- [ ] **T11 · `construirGrafo()`** (R3.5)
  - `src/lib/linaje.js`, función pura.
  - ✅ Verificar: prueba rápida con Node sobre el `catalog.json` real (conteos de tablas, modelos y
    aristas).

- [ ] **T12 · Página `/linaje`** (R3.1–R3.4)
  - SVG bipartito, selección bidireccional, panel de impacto, buscador, `?tabla=` en la URL,
    teclado, fallback de lista en móvil. Links desde el detalle. Entrada en la navbar.
  - ✅ Verificar: Playwright; clic en una tabla compartida entre proyectos → resalta los modelos
    de ambos y los conteos del panel son correctos; a 400px se ve la lista; cero errores de consola.

## Fase 5 — Portafolio

- [ ] **T13 · Página `/portafolio`** (R4.1–R4.5)
  - Leer la skill `dataviz` antes de empezar. KPIs, matriz área × estado, ranking de salud,
    actividad reciente, estilos de impresión. El dashboard lee `?area=&estado=` de la URL.
  - ✅ Verificar: Playwright; clic en una celda de la matriz → el dashboard queda filtrado;
    la impresión a PDF (Playwright `page.pdf`) queda legible en A4.

## Fase 6 — Demo y presentación

- [ ] **T14 · 🔒 Datos demo realistas** (R5.2)
  - 3 repos privados nuevos (`coaa_`/`coeaa_`, áreas distintas) con tablas compartidas con
    `coaa_pyneg_demo_activos`, y al menos un modelo con drift y uno en producción (tag).
  - ✅ Verificar: el dashboard muestra los 3 niveles de salud; el linaje tiene al menos 2 tablas
    compartidas entre proyectos.

- [ ] **T15 · README con capturas + guion de demo** (R5.3)
  - Capturas con Playwright (dashboard, linaje con selección, portafolio) en `static/img/readme/`.
    Sección "Demo en 90 segundos".

- [ ] **T16 · 🔒 Deploy y verificación final** (§9 del spec)
  - Push a `main`, Pages. Recorrido completo con Playwright en producción, ambos temas.
  - Cierre: `estado` del spec → sección de bitácora en el RFC, nota del vault (Estado actual /
    Próximos pasos), ADR-003 (salud y doc drift: definición y pesos), bugs no obvios en
    `Bugs-and-Learnings/`, y `/ponytail-review` sobre el diff.
