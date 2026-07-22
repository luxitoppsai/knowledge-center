import React from 'react';

/**
 * Anillo de progreso compacto (SVG puro, sin librería) — usado para la completitud de doc.
 * Más visual que una barra fina: el porcentaje vive adentro del anillo mismo.
 */
export default function ProgressRing({ value, size = 44, stroke = 4, color = 'var(--kc-cyan)' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, value)) / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="kc-ring">
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--kc-track)" strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{transition: 'stroke-dashoffset 0.3s ease'}}
      />
      <text
        x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fontSize={size * 0.28} fontWeight="700" fill="var(--kc-ink)"
        fontFamily="var(--ifm-font-family-monospace)"
      >
        {value}
      </text>
    </svg>
  );
}
