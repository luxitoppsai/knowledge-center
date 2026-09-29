// Grafo global de linaje (RFC-002 R3.5): tablas ↔ modelos de todo el portafolio, derivado del
// catálogo en build time. Función pura: sin fetch, sin estado.

/**
 * @param {Array} catalog Catálogo de proyectos (src/data/catalog.json).
 * @returns {{tablas: Array, modelos: Array, aristas: Array, compartidas: number}}
 *   tablas: [{id, modelos: [modeloId], proyectos: [slug]}], ordenadas por nº de modelos (desc);
 *   modelos: [{id, nombre, proyecto, salud, tablas: [tablaId]}], agrupados por proyecto;
 *   compartidas: tablas usadas por más de un proyecto.
 */
export function construirGrafo(catalog) {
  const tablas = new Map();
  const modelos = [];
  const aristas = [];

  for (const p of catalog) {
    for (const m of p.modelos || []) {
      const id = `${p.slug}/${m.nombre}`;
      const ts = (m.sources && m.sources.table_list) || [];
      modelos.push({
        id,
        nombre: m.nombre,
        proyecto: {slug: p.slug, nombre: p.nombre, estado: p.estado},
        salud: m.salud,
        tablas: ts,
      });
      for (const t of ts) {
        if (!tablas.has(t)) tablas.set(t, {id: t, modelos: [], proyectos: []});
        const nodo = tablas.get(t);
        nodo.modelos.push(id);
        if (!nodo.proyectos.includes(p.slug)) nodo.proyectos.push(p.slug);
        aristas.push({tabla: t, modelo: id});
      }
    }
  }

  const ordenadas = [...tablas.values()].sort(
    (a, b) => b.modelos.length - a.modelos.length || a.id.localeCompare(b.id),
  );
  return {
    tablas: ordenadas,
    modelos,
    aristas,
    compartidas: ordenadas.filter((t) => t.proyectos.length > 1).length,
  };
}

/** Vecinos de un nodo seleccionado: {tablas: Set, modelos: Set} (el nodo incluido). */
export function vecinos(grafo, sel) {
  if (!sel) return null;
  if (sel.tipo === 'tabla') {
    const t = grafo.tablas.find((x) => x.id === sel.id);
    return {tablas: new Set([sel.id]), modelos: new Set(t ? t.modelos : [])};
  }
  const m = grafo.modelos.find((x) => x.id === sel.id);
  return {tablas: new Set(m ? m.tablas : []), modelos: new Set([sel.id])};
}

/** ``catalog.riesgos.hm_buro`` → ``riesgos.hm_buro`` (el catálogo raíz es igual para todas). */
export function nombreCorto(tabla) {
  const partes = tabla.split('.');
  return partes.length > 2 ? partes.slice(1).join('.') : tabla;
}
