import React, {useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import catalog from '@site/src/data/catalog.json';
import Icon from '@site/src/components/Icon';
import {SaludBadge} from '@site/src/components/Salud';
import {NIVELES, modelosPorSalud} from '@site/src/lib/salud';
import {construirGrafo} from '@site/src/lib/linaje';
import {describirEvento} from '@site/src/lib/eventos';
import styles from './portafolio.module.css';

const ESTADOS = [
  {clave: 'produccion', label: 'Producción'},
  {clave: 'desarrollo', label: 'Desarrollo'},
  {clave: 'nuevo', label: 'Nuevo'},
];
const UMBRALES = [50, 80];
const EVENTOS_RECIENTES = 12;

function fmtFecha(iso) {
  // UTC fijo: el HTML del build y el render del navegador deben producir el mismo texto
  return new Date(iso).toLocaleDateString('es-PE', {year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'});
}

function Kpi({valor, label}) {
  return (
    <div className={styles.kpi}>
      <div className={styles.kpiValor}>{valor}</div>
      <div className={styles.kpiLabel}>{label}</div>
    </div>
  );
}

/** Escalón 1–4 de la rampa secuencial para un conteo (0 = sin relleno). */
function escalon(n, max) {
  if (!n) return 0;
  return Math.max(1, Math.ceil((4 * n) / max));
}

function Matriz() {
  const base = useBaseUrl('/');
  const areas = [...new Set(catalog.map((p) => p.area || 'sin área'))].sort();
  const conteo = (a, e) =>
    catalog.filter((p) => (p.area || 'sin área') === a && p.estado === e).length;
  const max = Math.max(1, ...areas.flatMap((a) => ESTADOS.map((e) => conteo(a, e.clave))));

  return (
    <div className={styles.scrollX}>
      <table className={styles.matriz}>
        <caption className={styles.srOnly}>Proyectos por área y estado</caption>
        <thead>
          <tr>
            <th scope="col">Área</th>
            {ESTADOS.map((e) => <th key={e.clave} scope="col">{e.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {areas.map((a) => (
            <tr key={a}>
              <th scope="row" className={styles.mono}>{a}</th>
              {ESTADOS.map((e) => {
                const n = conteo(a, e.clave);
                const s = escalon(n, max);
                const estilo = s ? {background: `var(--kc-seq-${s})`, color: `var(--kc-seq-ink-${s})`} : undefined;
                return (
                  <td key={e.clave}>
                    {n ? (
                      <a
                        className={styles.celda}
                        style={estilo}
                        href={`${base}?area=${encodeURIComponent(a)}&estado=${e.clave}`}
                        title={`${n} ${n === 1 ? 'proyecto' : 'proyectos'} de ${a} en ${e.label.toLowerCase()} — ver en el dashboard`}
                      >
                        {n}
                      </a>
                    ) : (
                      <span className={`${styles.celda} ${styles.celdaVacia}`} aria-label="0">·</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FilaRanking({m, activo, onHover}) {
  const n = NIVELES[m.salud.nivel];
  const href = useBaseUrl(`/proyecto/${m.proyecto.slug}`) + `#modelo-${m.nombre}`;
  return (
    <li
      className={`${styles.fila} ${activo ? styles.filaActiva : ''}`}
      onMouseEnter={() => onHover(m)}
      onMouseLeave={() => onHover(null)}
    >
      <a href={href} className={styles.filaNombre} onFocus={() => onHover(m)} onBlur={() => onHover(null)}>
        <span className={styles.mono}>{m.nombre}</span>
        <span className={styles.filaProyecto}>{m.proyecto.nombre}</span>
      </a>
      <div className={styles.barraZona}>
        {UMBRALES.map((u) => <span key={u} className={styles.umbral} style={{left: `${u}%`}} />)}
        <span className={styles.barra} style={{width: `${Math.max(m.salud.score, 0.6)}%`, background: n.color}} />
      </div>
      <span className={styles.filaScore} style={{color: n.color}}>
        <Icon name={n.icon} className={styles.iconoMini} />
        {m.salud.score}
      </span>
    </li>
  );
}

function Ranking({modelos}) {
  const [hover, setHover] = useState(null);
  return (
    <>
      <div className={styles.eje} aria-hidden="true">
        <span />
        <div className={styles.ejeZona}>
          <span style={{left: 0}}>0</span>
          {UMBRALES.map((u) => <span key={u} style={{left: `${u}%`}}>{u}</span>)}
          <span style={{left: '100%'}}>100</span>
        </div>
        <span />
      </div>
      <ul className={styles.ranking} aria-label="Ranking de salud por modelo, del peor al mejor">
        {modelos.map((m) => (
          <FilaRanking
            key={`${m.proyecto.slug}/${m.nombre}`}
            m={m}
            activo={hover === m}
            onHover={setHover}
          />
        ))}
      </ul>
      <div className={styles.tooltip} aria-live="polite">
        {hover ? (
          <>
            <SaludBadge salud={hover.salud} /> <strong className={styles.mono}>{hover.nombre}</strong>
            {' — '}
            {hover.salud.motivos.length ? hover.salud.motivos.join(' · ') : 'Sin observaciones'}
          </>
        ) : (
          <span className={styles.hint}>Pasa el cursor por un modelo para ver por qué tiene ese puntaje.</span>
        )}
      </div>
      <details className={styles.tabla}>
        <summary>Ver como tabla</summary>
        <div className={styles.scrollX}>
          <table>
            <thead>
              <tr><th>Modelo</th><th>Proyecto</th><th>Salud</th><th>Nivel</th><th>Motivos</th></tr>
            </thead>
            <tbody>
              {modelos.map((m) => (
                <tr key={`${m.proyecto.slug}/${m.nombre}`}>
                  <td className={styles.mono}>{m.nombre}</td>
                  <td>{m.proyecto.nombre}</td>
                  <td>{m.salud.score}</td>
                  <td>{NIVELES[m.salud.nivel].label}</td>
                  <td>{m.salud.motivos.join(' · ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}

function Actividad() {
  const base = useBaseUrl('/proyecto/');
  const eventos = catalog
    .flatMap((p) => (p.historial || []).map((e) => ({...e, proyecto: p})))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, EVENTOS_RECIENTES);
  if (eventos.length === 0) return <p className={styles.hint}>Sin actividad registrada.</p>;
  return (
    <ul className={styles.actividad}>
      {eventos.map((e, i) => (
        <li key={i}>
          <span className={`${styles.tag} ${e.tipo === 'release' ? styles.tagRelease : ''}`}>
            {e.tipo === 'release' ? 'release' : 'doc'}
          </span>
          <span className={styles.fecha}>{fmtFecha(e.fecha)}</span>
          <a href={`${base}${e.proyecto.slug}`} className={styles.actProyecto}>{e.proyecto.nombre}</a>
          <a href={e.url} target="_blank" rel="noopener" className={styles.actDetalle} title={e.detalle}>
            {describirEvento(e)}
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function Portafolio() {
  const modelos = useMemo(() => modelosPorSalud(catalog), []);
  const grafo = useMemo(() => construirGrafo(catalog), []);
  const saludables = modelos.filter((m) => m.salud.nivel === 'saludable').length;
  const pct = modelos.length ? Math.round((100 * saludables) / modelos.length) : 0;
  const conDrift = modelos.filter((m) => m.drift).length;
  const sinArea = catalog.filter((p) => !p.area);
  const {siteConfig} = useDocusaurusContext();
  const alBuild = fmtFecha(siteConfig.customFields.fechaBuild);

  return (
    <Layout title="Portafolio" description="Estado del portafolio de modelos del COE">
      <div className={styles.page}>
       <div className={styles.pageInner}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>Portafolio de modelos · datos al {alBuild}</p>
          <h1 className={styles.titulo}>Estado del portafolio</h1>
        </header>

        <section className={styles.resumen} aria-label="Indicadores">
          <div className={styles.hero}>
            <div className={styles.heroValor}>{pct}%</div>
            <div className={styles.heroLabel}>
              de los modelos están saludables ({saludables} de {modelos.length})
            </div>
          </div>
          <div className={styles.kpis}>
            <Kpi valor={catalog.length} label="proyectos" />
            <Kpi valor={modelos.length} label="modelos" />
            <Kpi valor={conDrift} label="con Model Card desactualizado" />
            <Kpi valor={grafo.tablas.length} label="tablas fuente" />
            <Kpi valor={grafo.compartidas} label="tablas compartidas entre proyectos" />
          </div>
        </section>

        {sinArea.length > 0 && (
          <p className={styles.aviso} role="status">
            <Icon name="alert" className={styles.iconoMini} />
            <span>
              <strong>Calidad de datos:</strong> {sinArea.length}{' '}
              {sinArea.length === 1 ? 'proyecto no declara' : 'proyectos no declaran'} su área
              ({sinArea.map((p) => p.nombre).join(', ')}). Agrega <code>project.yaml</code> con el
              campo <code>area</code> para que cuente en la matriz.
            </span>
          </p>
        )}

        <div className={styles.grid}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitulo}>Proyectos por área y estado</h2>
            <p className={styles.hint}>Más oscuro = más proyectos. Cada celda abre el dashboard filtrado.</p>
            <Matriz />
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitulo}>Actividad reciente</h2>
            <p className={styles.hint}>Últimos cambios de documentación y releases en todo el portafolio.</p>
            <Actividad />
          </section>

          <section className={`${styles.panel} ${styles.ancho}`}>
            <h2 className={styles.panelTitulo}>Salud por modelo</h2>
            <p className={styles.hint}>
              Del peor al mejor. Líneas en 50 y 80: umbrales de crítico, atención y saludable.
            </p>
            <Ranking modelos={modelos} />
          </section>
        </div>
       </div>
      </div>
    </Layout>
  );
}
