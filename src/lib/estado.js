// Ciclo de vida del proyecto (RFC-003 R1): se muestra NEUTRO (ícono + etiqueta). Verde, ámbar y
// rojo quedan reservados para la salud; si el estado también se pintara, un mismo color
// significaría dos cosas en la misma card.

export const ESTADOS = {
  produccion: {label: 'Producción', icon: 'produccion'},
  desarrollo: {label: 'Desarrollo', icon: 'desarrollo'},
  nuevo: {label: 'Nuevo', icon: 'nuevo'},
};

export const ORDEN_ESTADOS = ['produccion', 'desarrollo', 'nuevo'];

export function estadoDe(clave) {
  return ESTADOS[clave] || ESTADOS.nuevo;
}
