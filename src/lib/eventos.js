// Traduce eventos del historial (commits a docs/ y tags) a lenguaje de negocio (RFC-003 R14).
// Entiende commits convencionales ("tipo(alcance): texto"); lo que no reconoce se muestra tal cual.

const CONVENCIONAL = /^(\w+)(?:\(([^)]+)\))?!?:\s*(.+)$/;

function capitalizar(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * @param {{tipo: string, detalle: string}} e Evento del historial.
 * @returns {string} Descripción legible ("Proyecto creado", "Reentrenamiento de X", ...).
 */
export function describirEvento(e) {
  if (e.tipo === 'release') return e.detalle.replace(/^Tag /, 'Release ');
  const m = (e.detalle || '').match(CONVENCIONAL);
  if (!m) return e.detalle;
  const [, tipo, alcance, texto] = m;
  if (/repo inicial/i.test(texto)) return 'Proyecto creado';
  if (/reentrenamiento/i.test(texto)) return alcance ? `Reentrenamiento de ${alcance}` : 'Reentrenamiento';
  if (tipo === 'docs') return alcance ? `Documentación de ${alcance} actualizada` : 'Documentación actualizada';
  if (tipo === 'fix') return `Corrección${alcance ? ` en ${alcance}` : ''}: ${texto}`;
  return capitalizar(texto);
}
