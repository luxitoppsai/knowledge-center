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
  // Salud: saludable / atención / crítico (siempre junto a su etiqueta, nunca color solo)
  check: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.2 12.3 2.6 2.6 5-5.4" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4 21 19.5H3Z" />
      <path d="M12 10v4.2M12 17h.01" />
    </>
  ),
  critical: (
    <>
      <path d="M8.3 3.5h7.4l4.8 4.8v7.4l-4.8 4.8H8.3l-4.8-4.8V8.3Z" />
      <path d="M12 8v5M12 16.2h.01" />
    </>
  ),
  // Ciclo de vida (neutro, sin color): nuevo = círculo punteado, desarrollo = medio, producción = lleno
  nuevo: (
    <circle cx="12" cy="12" r="7.5" strokeDasharray="2.6 2.6" />
  ),
  desarrollo: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 4.5a7.5 7.5 0 0 1 0 15Z" fill="currentColor" stroke="none" />
    </>
  ),
  produccion: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 5 5" />
    </>
  ),
  // Linaje global: grafo tablas → modelos
  graph: (
    <>
      <circle cx="5.5" cy="6" r="2" /><circle cx="5.5" cy="18" r="2" />
      <circle cx="18.5" cy="12" r="2" />
      <path d="M7.5 6.4c5 .6 5 4.8 9 5.4M7.5 17.6c5-.6 5-4.8 9-5.4" />
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

export default function Icon({ name, className, style }) {
  const p = paths[name];
  if (!p) return null;
  return (
    <svg {...base} className={className} style={style} aria-hidden="true">
      {p}
    </svg>
  );
}
