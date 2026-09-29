// Presentación de la salud del modelo (RFC-002 R2.3). El cálculo vive en scripts/aggregate.py;
// acá solo se mapea el nivel a etiqueta + ícono + color de estado.

export const NIVELES = {
  saludable: {label: 'Saludable', icon: 'check', color: 'var(--kc-green)', bg: 'var(--kc-green-bg)'},
  atencion: {label: 'Atención', icon: 'alert', color: 'var(--kc-amber)', bg: 'var(--kc-amber-bg)'},
  critico: {label: 'Crítico', icon: 'critical', color: 'var(--kc-red)', bg: 'var(--kc-red-bg)'},
};

export const COMPONENTES = [
  {clave: 'documentacion', label: 'Documentación'},
  {clave: 'frescura', label: 'Frescura'},
  {clave: 'desempeno', label: 'Desempeño declarado'},
  {clave: 'linaje', label: 'Linaje declarado'},
];

/** Modelos del catálogo aplanados con su proyecto, del peor al mejor puntaje. */
export function modelosPorSalud(catalog) {
  return catalog
    .flatMap((p) => (p.modelos || []).map((m) => ({...m, proyecto: p})))
    .filter((m) => m.salud)
    .sort((a, b) => a.salud.score - b.salud.score);
}
