---
type: rfc
rfc: RFC-005
estado: aceptado
fecha: 2026-09-29
---

# RFC-005 — Claridad visual y exploración del portafolio

## Problema y acuerdo

La revisión visual encontró textos pequeños, identificadores truncados, filtros que mezclan
unidades y acciones que presuponen conocer el generador externo. El usuario autorizó aplicar
todas las mejoras de esa revisión. Este RFC reemplaza las decisiones de RFC-004 que limitaban
la vista de proyectos a tarjetas y los motivos adicionales a un tooltip.

## Alcance

- Conservar paleta, tipografía, estados neutros, navegación y acordeones; mejorar legibilidad
  en ambos temas y controles táctiles. Salud pasa a llamarse **salud documental**, con /100 y
  explicación accesible; no se cambia su fórmula ni se presenta como monitoreo del modelo.
- Dashboard: filtros rotulados, conteos explícitos de proyectos, X de Y resultados, motivos
  desplegables sin controles anidados, guía de actualización y comando copiable; KPI con destino
  explícito, tres modelos por tarjeta y enlace al resto, vista de tabla con los mismos filtros.
- Identificadores exactos, legibles y copiables en detalle/ficha. No inventar nombres funcionales.
- Portafolio: ranking antes de actividad, cinco eventos iniciales, expansión por clic,
  descripciones de hasta dos líneas con acceso al texto completo, botón imprimir/PDF y leyenda
  numérica de la matriz coherente con las escalas clara y oscura.
- Linaje: título preciso, limpiar selección, etiquetas legibles al atenuar conexiones,
  nombres completos en impacto. Se conservan grafo y lista móvil.
- Model Card: aviso de **posible** desactualización, fechas y acción; las fechas de commits no
  prueban reentrenamiento. Ordenar secciones descargadas para presentar propósito, funcionamiento,
  métricas y limitaciones antes de identidad técnica, conservando contenido y encabezados.

## Alternativas y límites

Se eligen controles nativos (`details`, botones, links, tablas) y componentes pequeños sobre
modales o nuevas dependencias UI. El orden del Model Card se ajusta durante la agregación para
mantener coherentes contenido, TOC y navegación sin manipular el DOM hidratado ni editar repos
externos. No se cambia la arquitectura de datos, no se regeneran modelos ni se modifican
los otros repos del ecosistema. El usuario solicitó después push a `main` y despliegue en Pages;
la publicación usa el workflow existente, sin cambiar su configuración. Las pruebas usan datos ficticios locales en una copia
temporal; el catálogo versionado sigue vacío.

## Criterios de aceptación

- Las vistas muestran salud documental y escala /100 sin depender del hover para explicarla.
- Los filtros de proyectos tienen etiquetas y conteos explícitos; tarjetas y tabla coinciden.
- Motivos, ayuda, nombres completos y copia funcionan con teclado y toque.
- KPI navegan a su destino declarado sin confundir salud de proyectos y modelos.
- Las tarjetas limitan modelos visibles a tres; el resto se alcanza desde el detalle.
- Ranking precede a actividad, hay expansión de eventos y un botón de impresión; leyenda válida
  en ambos temas y nombres legibles en impacto; limpiar selección también limpia URL y resaltado.
- Se conservan todas las secciones del Model Card, incluidas las que contienen código con ##.
- Pruebas Python y build pasan; pruebas con clics reales en claro, oscuro y móvil, con más de
  tres proyectos, sin errores de aplicación ni desbordamiento horizontal del documento.

## Verificación

- 37 pruebas Python aprobadas, incluyendo reordenamiento sin pérdida de secciones, código
  cercado y archivos sin salto final.
- Build de producción aprobado con el catálogo vacío versionado y con la fixture de seis
  proyectos/nueve modelos. El aviso local de acceso al comprobador de actualizaciones de
  Docusaurus no impide la compilación.
- `verify_ux.py` aprobado en claro/oscuro × escritorio/móvil táctil: clics, teclado, copia,
  destinos de KPI, filtros persistidos, tabla, nombres largos, Model Card, linaje y eventos.
  Sin errores de aplicación, fallos de red externos ni desbordamiento horizontal del documento.
- PDF A4 exportado desde Chromium y sus dos páginas renderizadas con Poppler e inspeccionadas.
  Se corrigieron márgenes oscuros por `color-scheme` y anchos de columnas; la tabla repite su
  encabezado y preserva identificadores completos al paginar.
- Se conservó vacío `src/data/catalog.json`. No se ejecutó la agregación local contra GitHub;
  el workflow de deploy realizará la agregación real. Las suites antiguas específicas de los
  repos demo se actualizaron por los cambios de interfaz, pero no se ejecutaron localmente
  contra esos repos. La suite reproducible es la evidencia local de UX.

Las capturas y PDF de revisión se generaron en `/tmp/kc-ux-review`; se pueden reproducir con
las instrucciones de CONTRIBUTING. No se versionan datos ficticios en el catálogo ni docs
agregados. La confirmación del despliegue se comunica junto al enlace del workflow al publicar.
