import React from 'react';

// Set de iconos propio (trazo, sin relleno) — reemplaza los emoji, que leían a medio terminar.
// Minimal a propósito: 1.6 de grosor, 20x20, currentColor. Sin dependencia de librerías de iconos.

const base = {
  width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round',
};

const paths = {
  // Model Card: nodos conectados (referencia directa a "modelo" en vez de un cerebro decorativo)
  model: (
    <>
      <circle cx="6" cy="6" r="2.4" /><circle cx="18" cy="6" r="2.4" />
      <circle cx="12" cy="18" r="2.4" />
      <path d="M8.1 7.3 10.3 16M15.9 7.3 13.7 16M8.4 6h7.2" />
    </>
  ),
  // Linaje: eslabones de cadena
  lineage: (
    <>
      <rect x="3.5" y="8.5" width="7" height="7" rx="2.2" />
      <rect x="13.5" y="8.5" width="7" height="7" rx="2.2" />
      <path d="M10.5 12h3" />
    </>
  ),
  // Funciones: engranaje simplificado
  functions: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.4M12 18.6V21M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M3 12h2.4M18.6 12H21M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7" />
    </>
  ),
  // Documentación: archivo
  doc: (
    <>
      <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M14 3.5V8h4M9 12.5h6M9 16h6" />
    </>
  ),
  // Histórico: reloj
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3.2 1.9" />
    </>
  ),
};

export default function Icon({ name, className }) {
  const p = paths[name];
  if (!p) return null;
  return (
    <svg {...base} className={className} aria-hidden="true">
      {p}
    </svg>
  );
}
