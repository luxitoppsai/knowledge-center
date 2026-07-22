# Contribuir a Knowledge Center

## Setup de desarrollo

```bash
npm install
pip install requests   # única dependencia de scripts/aggregate.py
```

Necesitás Node ≥18 y Python ≥3.10. Autenticación con GitHub: o exportás `GITHUB_TOKEN`, o tenés
`gh` autenticado (`gh auth login`) — `aggregate.py` cae a `gh auth token` si no hay env var.

## Flujos comunes

**Tocar solo el diseño/dashboard** (sin re-agregar):
```bash
npm start   # dev server, hot-reload, usa el catalog.json que ya esté en src/data/
```

**Probar el agregador** (`scripts/aggregate.py`) de punta a punta:
```bash
export KC_OWNER=tu-usuario
python scripts/aggregate.py
npm run build && npm run serve
```

**Simular muchos proyectos** (para probar la grilla/layout sin crear repos reales): generá un
`src/data/catalog.json` a mano con N entradas del mismo esquema (ver una entrada real como
plantilla) y corré `npm run build`. Hacé un backup del catálogo real antes (`cp src/data/catalog.json
/tmp/catalog_backup.json`) para no perderlo.

## Cómo verificamos los cambios en este proyecto (importante)

**`curl` o leer el HTML generado NO alcanza para validar un cambio.** Este es un sitio Docusaurus
(SPA con hidratación React) — el HTML server-rendered puede verse perfecto mientras la navegación
por clic real falla (ya pasó: un bug de rutas del plugin daba 404 al hacer clic, pero `curl` a la
URL directa devolvía 200 porque no ejecuta JS ni hidrata). La forma correcta de verificar:

```bash
# Playwright headless, en un directorio aparte (no ensucia este repo)
mkdir -p /tmp/pw && cd /tmp/pw && npm init -y && npm install playwright
npx playwright install chromium
```

Y un script que **haga clic de verdad** (no solo cargue una URL):
```js
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  await page.goto('http://localhost:3210/knowledge-center/', { waitUntil: 'networkidle' });
  await page.click('text=Ver detalle →');   // <- el clic real, no una URL directa
  console.log('URL tras el clic:', page.url());
  console.log('errores:', errores.length ? errores.join(';') : '(ninguno)');
  await browser.close();
})();
```

Antes de dar por bueno un cambio de UI: probalo en **ambos temas** (claro/oscuro —
`localStorage.setItem('theme','light')` + reload) y, si tocaste layout, con **más de 3 proyectos**
en el catálogo (ver arriba) para no descubrir en producción que algo solo se ve bien con pocos ítems.

## Convenciones de diseño (no romper sin querer)

- **Nunca** pongas `margin: 0 auto` en un elemento que sea hijo directo de un contenedor
  `display:flex; flex-direction:column` (el `mainWrapper` de Docusaurus lo es) — desactiva el
  stretch y el ancho se calcula por contenido, no por el espacio disponible. Ya nos mordió una vez
  (ver `RFC.md` §13). Patrón correcto: el hijo directo del flex se estira full-width sin margen; el
  centrado con `max-width` + `margin:auto` va en un `<div>` **interno** (ver `.hero`/`.heroInner` o
  `.main`/`.mainInner` en `src/pages/index.js`).
- El gradiente de marca (`var(--kc-grad)`) está reservado al botón CTA. No lo agregues a números,
  barras ni otros elementos — si aparece en todo pierde jerarquía (ver auditoría UX/UI en `RFC.md`).
- Iconos: usá `src/components/Icon` (SVG propio). Nada de emoji en la interfaz ni en
  `sidebar_label` de los docs — se corrigió a propósito, no lo reintroduzcas.
- Los colores/tamaños viven en tokens CSS (`--kc-*`, `--ifm-*`) en `src/css/custom.css`, con un
  bloque `:root` (claro, default) y un override `html[data-theme='dark']`. Si agregás un color
  nuevo, definilo como token en ambos bloques, no lo hardcodees en un módulo CSS.

## Antes de un PR

1. `npm run build` sin errores ni warnings nuevos.
2. Verificación con clic real (Playwright) del flujo que tocaste, en ambos temas.
3. Si tocaste `scripts/aggregate.py`: corré `python scripts/aggregate.py` contra datos reales y
   revisá que el `catalog.json` resultante tenga sentido (no lo comitees con datos de prueba).
4. Actualizá `RFC.md` si el cambio es una decisión de arquitectura (no un fix cosmético).
