# RFC-003 · Tareas

> **Estado: 8/8 (2026-09-29).** Desviaciones respecto del plan:
> - `DocGlifo` no se construyó: la completitud por modelo pasó a texto ("2/3 docs") en la fila
>   del acordeón. Es más claro que un glifo y no suma otra forma que aprender.
> - El panel de `/linaje` no necesitó cambios: nunca pintaba el ciclo de vida con color.
> - Extra, no planeado: el autodoc ahora formatea la fecha "Generado" y explicita las métricas
>   vacías (ambas cosas salieron en la auditoría). Solo afecta a los Model Cards generados de
>   aquí en adelante; los de las demos no se regeneraron para no borrar el caso de drift.

- [x] **T01 · Agregador** (R2–R4): `calcular_salud` con faltantes, `intro_readme`, `aviso_drift`
  y tests.
- [x] **T02 · Semántica compartida** (R1): `lib/estado.js`, `EstadoTag`, `DocGlifo`.
- [x] **T03 · Dashboard** (R5–R9): encabezado compacto, atención clicable, toolbar en la URL, card
  nueva. Se borra `ProgressRing`.
- [x] **T04 · Detalle** (R10–R13): salud de los modelos, bloques colapsables, metadata compacta,
  histórico colapsado, fix de `.page`.
- [x] **T05 · Portafolio y linaje** (R1, R14, R15): eventos legibles, aviso de "sin área", estado
  neutro en el panel de linaje.
- [x] **T06 · Docs** (R16): `/docs/intro`.
- [x] **T07 · 🔒 Repos** (R3): README del template y de los 5 repos demo sin relleno;
  `project.yaml` en pyneg.
- [x] **T08 · Verificación y deploy** (§8): Playwright local → push → Playwright en producción.
  Capturas del README actualizadas. Cierre en el vault.
