import React from 'react';
import Icon from '@site/src/components/Icon';
import {NIVELES, COMPONENTES} from '@site/src/lib/salud';
import {describirMotivo} from '@site/src/lib/motivos';
import ModelCardHelp from '@site/src/components/ModelCardHelp';
import styles from './styles.module.css';

/** Badge de salud: ícono + puntaje + etiqueta (el color nunca va solo). */
export function SaludBadge({salud, conEtiqueta = true}) {
  if (!salud) return null;
  const n = NIVELES[salud.nivel];
  return (
    <span
      className={styles.badge}
      style={{color: n.color, background: n.bg}}
      title={`Salud documental ${salud.score}/100 · ${n.label}`}
    >
      <Icon name={n.icon} className={styles.badgeIcon} />
      <span className={styles.badgeScore}>{salud.score}/100</span>
      {conEtiqueta && <span className={styles.badgeLabel}>{n.label}</span>}
    </span>
  );
}

export function SaludExplicacion() {
  return (
    <details className={styles.explicacion}>
      <summary>¿Qué mide la salud documental?</summary>
      <p>Puntaje de 0 a 100 basado en documentos presentes, su actualización respecto a los
        metadatos y la declaración de una métrica AUC y tablas fuente. No verifica la calidad
        del contenido ni el desempeño actual del modelo. Saludable ≥ 80 · Atención 50–79 ·
        Crítico &lt; 50. El proyecto toma el puntaje de su peor modelo.</p>
    </details>
  );
}

function colorComponente(valor, max) {
  if (valor >= max) return NIVELES.saludable;
  return valor > 0 ? NIVELES.atencion : NIVELES.critico;
}

function Medidor({label, valor, max}) {
  const c = colorComponente(valor, max);
  return (
    <div className={styles.meter}>
      <div className={styles.meterHead}>
        <span>{label}</span>
        <span className={styles.meterValue}>{valor}/{max}</span>
      </div>
      <div
        className={styles.track}
        style={{background: c.bg}}
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={valor}
      >
        <div className={styles.fill} style={{width: `${(100 * valor) / max}%`, background: c.color}} />
      </div>
    </div>
  );
}

function fmtFecha(iso) {
  return new Date(iso).toLocaleDateString('es-PE', {year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'});
}

/** Bloque de salud del detalle: puntaje, 4 medidores, motivos y aviso de drift. */
export function SaludDetalle({salud, drift, repoUrl}) {
  if (!salud) return null;
  return (
    <div className={styles.detalle}>
      <div className={styles.detalleHead}>
        <span className={styles.detalleTitulo}>Salud documental</span>
        <span className={styles.detalleTotal}>{salud.score}/100</span>
      </div>

      {drift && (
        <div className={styles.drift} role="status">
          <Icon name="clock" className={styles.badgeIcon} />
          <span>
            <strong>Documentación posiblemente desactualizada.</strong>{' '}
            Model Card: {fmtFecha(drift.fecha_card)} · Metadatos: {fmtFecha(drift.fecha_metadata)}
            {' '}({drift.dias} {drift.dias === 1 ? 'día' : 'días'} de diferencia).
          </span>
        </div>
      )}

      <div className={styles.meters}>
        {COMPONENTES.map(({clave, label}) => (
          <Medidor key={clave} label={label} valor={salud.componentes[clave]} max={salud.maximos[clave]} />
        ))}
      </div>

      {salud.motivos.length > 0 && (
        <ul className={styles.motivos}>
          {salud.motivos.map((m) => <li key={m}>{describirMotivo(m)}</li>)}
        </ul>
      )}

      {(drift || salud.componentes.frescura < salud.maximos.frescura) && <ModelCardHelp repoUrl={repoUrl} />}

      <details className={styles.como}>
        <summary>¿Cómo se calcula?</summary>
        <p>
          Documentación: % de docs esperados × {salud.maximos.documentacion / 100}. Frescura:{' '}
          {salud.maximos.frescura} si el Model Card está al día con su <code>model_data.json</code>,
          la mitad con hasta 30 días de atraso y 0 con más o sin card. Desempeño y linaje: puntaje
          completo si están declarados. Saludable ≥ 80 · Atención 50–79 · Crítico &lt; 50.
        </p>
      </details>
    </div>
  );
}
