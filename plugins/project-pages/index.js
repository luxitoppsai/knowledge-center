// Plugin Docusaurus: genera una ruta /proyecto/<slug> por cada proyecto del catálogo.
// Los datos se hornean en build time (createData + addRoute) — sin fetch en cliente, funciona
// igual de rápido y estático en GitHub Pages.

const path = require('path');
const catalog = require('../../src/data/catalog.json');

module.exports = function projectPagesPlugin() {
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
          path: `/proyecto/${project.slug}`,
          component: '@site/src/components/ProjectDetail/index.js',
          modules: {project: dataPath},
          exact: true,
        });
      }
    },
  };
};
