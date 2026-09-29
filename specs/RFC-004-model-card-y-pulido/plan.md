# RFC-004 · Plan técnico

- **Ficha (R1, R2):** wrapper de `@theme/DocItem/Content` en `src/theme/DocItem/Content/index.js`
  (swizzle de tipo *wrap*, la forma segura de extender el tema). Usa `useDoc()` para obtener el
  `id` del documento (`<slug>/<modelo>/<doc>`), busca proyecto y modelo en `catalog.json` y
  renderiza `components/FichaModelo`. Si el documento no es de un modelo (por ejemplo
  `intro`), no muestra nada.
- **Agregador (R2):** se borran `aviso_drift()`, `_fecha_corta()`, `_MESES`, la reescritura de la
  card y su test.
- **Docs (R3):** reglas en `custom.css` bajo `.markdown` (escala de títulos; `table` a lo ancho
  desde 997 px).
- **Footer (R4):** `footer.style: 'light'` + estilos en `custom.css`; el copyright usa
  `customFields.fechaBuild`, calculado en la misma config.
- **Dashboard (R5, R6, R8):** copy de la card y de la sección; `+N` en `AtencionItem`;
  `@media (pointer: coarse)` en los CSS modules.
- **Detalle (R7):** `resumenGrid` a una columna si `modelos.length === 1`; `modeloCuerpo` con la
  variante `sinNarrativa`.
- **Navbar (R9):** se quita el item en `docusaurus.config.js`.
- **Verificación:** `verify_rfc004.py` (Playwright) por criterio; se re-ejecutan los scripts de
  RFC-002 y RFC-003 como regresión.
