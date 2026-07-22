// Plugin Docusaurus: genera una ruta /proyecto/<slug> por cada proyecto del catálogo.
// Los datos se hornean en build time (createData + addRoute) — sin fetch en cliente, funciona
// igual de rápido y estático en GitHub Pages.
//
// IMPORTANTE: el `path` de addRoute debe incluir el baseUrl del sitio (normalizeUrl) — sin esto,
// el build estático genera el HTML igual (por coincidencia con la estructura de outDir), pero la
// tabla de rutas del CLIENTE (React Router) no reconoce la ruta al navegar por SPA: renderiza
// "Página No Encontrada" al hacer clic, aunque una carga directa por URL sí funcione.

const {normalizeUrl} = require('@docusaurus/utils');
const catalog = require('../../src/data/catalog.json');

module.exports = function projectPagesPlugin(context) {
  const {baseUrl} = context.siteConfig;
  return {
    name: 'project-pages-plugin',
    async contentLoaded({actions}) {
      const {createData, addRoute} = actions;
      for (const project of catalog) {
        const dataPath = await createData(
          `project-${project.slug}.json`,
          JSON.stringify(project),
        );
        addRoute({
          path: normalizeUrl([baseUrl, 'proyecto', project.slug]),
          component: '@site/src/components/ProjectDetail/index.js',
          modules: {project: dataPath},
          exact: true,
        });
      }
    },
  };
};
