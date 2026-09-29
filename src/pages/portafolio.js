import React, {useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import catalog from '@site/src/data/catalog.json';
import Icon from '@site/src/components/Icon';
import {SaludBadge, SaludExplicacion} from '@site/src/components/Salud';
import Identifier from '@site/src/components/Identifier';
import {describirMotivo} from '@site/src/lib/motivos';
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
const EVENTOS_RECIENTES = 5;

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
    <>
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
    <div className={styles.leyenda} aria-label="Leyenda: cantidad de proyectos por celda">
      <span className={styles.leyendaItem}><span className={`${styles.muestra} ${styles.celdaVacia}`} />0 proyectos</span>
      {[1, 2, 3, 4].map((nivel) => {
        const desde = Math.floor((nivel - 1) * max / 4) + 1;
        const hasta = Math.floor(nivel * max / 4);
        if (desde > hasta) return null;
        return <span className={styles.leyendaItem} key={nivel}>
          <span className={styles.muestra} style={{background: `var(--kc-seq-${nivel})`}} />
          {desde === hasta ? desde : `${desde}–${hasta}`} {hasta === 1 ? 'proyecto' : 'proyectos'}
        </span>;
      })}
    </div>
    </>
  );
}

function FilaRanking({m, activo, onHover, onSeleccion}) {
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
      <button type="button" className={styles.barraZona} onClick={() => onSeleccion(m)}
        aria-label={`Ver motivos de ${m.nombre}, salud documental ${m.salud.score}/100`}>
        {UMBRALES.map((u) => <span key={u} className={styles.umbral} style={{left: `${u}%`}} />)}
        <span className={styles.barra} style={{width: `${Math.max(m.salud.score, 0.6)}%`, background: n.color}} />
      </button>
      <span className={styles.filaScore} style={{color: n.color}}>
        <Icon name={n.icon} className={styles.iconoMini} />
        {m.salud.score}/100
      </span>
    </li>
  );
}

function Ranking({modelos}) {
  const [hover, setHover] = useState(null);
  const [seleccionado, setSeleccionado] = useState(null);
  const detalle = hover || seleccionado;
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
      <ul className={styles.ranking} aria-label="Ranking de salud documental por modelo, del menor al mayor puntaje">
        {modelos.map((m) => (
          <FilaRanking
            key={`${m.proyecto.slug}/${m.nombre}`}
            m={m}
            activo={detalle === m}
            onHover={setHover}
            onSeleccion={(modelo) => setSeleccionado(seleccionado === modelo ? null : modelo)}
          />
        ))}
      </ul>
      <div className={styles.tooltip} aria-live="polite">
        {detalle ? (
          <>
            <SaludBadge salud={detalle.salud} /> <Identifier value={detalle.nombre} copy />
            {' — '}
            {detalle.salud.motivos.length ? detalle.salud.motivos.map(describirMotivo).join(' · ') : 'Sin observaciones documentales'}
          </>
        ) : (
          <span className={styles.hint}>Selecciona una barra para ver los motivos del puntaje. También puedes usar el teclado.</span>
        )}
      </div>
      <details className={styles.tabla}>
        <summary>Ver como tabla</summary>
        <TablaSalud modelos={modelos} />
      </details>
      <div className={styles.tablaImpresion}><TablaSalud modelos={modelos} /></div>
    </>
  );
}

function TablaSalud({modelos}) {
  return (
    <div className={styles.scrollX}>
      <table>
        <caption>Salud documental por modelo</caption>
        <thead><tr><th scope="col">Modelo</th><th scope="col">Proyecto</th>
          <th scope="col">Salud documental</th><th scope="col">Nivel</th><th scope="col">Motivos</th></tr></thead>
        <tbody>{modelos.map((m) => (
          <tr key={`${m.proyecto.slug}/${m.nombre}`}>
            <th scope="row" className={styles.mono}>{m.nombre}</th><td>{m.proyecto.nombre}</td>
            <td>{m.salud.score}/100</td><td>{NIVELES[m.salud.nivel].label}</td>
            <td>{m.salud.motivos.map(describirMotivo).join(' · ') || 'Sin observaciones documentales'}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function Actividad() {
  const [todos, setTodos] = useState(false);
  const base = useBaseUrl('/proyecto/');
  const eventos = catalog
    .flatMap((p) => (p.historial || []).map((e) => ({...e, proyecto: p})))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const visibles = todos ? eventos : eventos.slice(0, EVENTOS_RECIENTES);
  if (eventos.length === 0) return <p className={styles.hint}>Sin actividad registrada.</p>;
  return (
    <>
    <ul className={styles.actividad}>
      {visibles.map((e, i) => (
        <li key={i}>
          <span className={`${styles.tag} ${e.tipo === 'release' ? styles.tagRelease : ''}`}>
            {e.tipo === 'release' ? 'Versión' : 'Documento'}
          </span>
          <span className={styles.fecha}>{fmtFecha(e.fecha)}</span>
          <a href={`${base}${e.proyecto.slug}`} className={styles.actProyecto}>{e.proyecto.nombre}</a>
          <details className={styles.actEvento}>
            <summary><span className={styles.actDetalle}>{describirEvento(e)}</span></summary>
            <p>{describirEvento(e)}</p>
            <a href={e.url} target="_blank" rel="noopener">Ver cambio en el repositorio ↗</a>
          </details>
        </li>
      ))}
    </ul>
    {eventos.length > EVENTOS_RECIENTES && <button type="button" className={styles.boton}
      aria-expanded={todos} onClick={() => setTodos(!todos)}>
      {todos ? 'Ver menos actividad' : `Ver ${eventos.length - EVENTOS_RECIENTES} eventos más`}
    </button>}
    </>
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
      <main className={styles.page}>
       <div className={styles.pageInner}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>Portafolio de modelos · datos al {alBuild}</p>
          <div className={styles.headFila}>
            <h1 className={styles.titulo}>Estado del portafolio</h1>
            <button type="button" className={styles.boton} onClick={() => window.print()}>Imprimir / Guardar PDF</button>
          </div>
        </header>

        <section className={styles.resumen} aria-label="Indicadores">
          <div className={styles.hero}>
            <div className={styles.heroValor}>{modelos.length ? `${pct}%` : '—'}</div>
            <div className={styles.heroLabel}>
              modelos con documentación saludable ({saludables} de {modelos.length})
            </div>
          </div>
          <div className={styles.kpis}>
            <Kpi valor={catalog.length} label="proyectos" />
            <Kpi valor={modelos.length} label="modelos" />
            <Kpi valor={conDrift} label="modelos con metadatos más recientes" />
            <Kpi valor={grafo.tablas.length} label="tablas fuente" />
            <Kpi valor={grafo.compartidas} label="tablas compartidas entre proyectos" />
          </div>
        </section>

        <SaludExplicacion />
        {sinArea.length > 0 && (
          <p className={styles.aviso} role="status">
            <Icon name="alert" className={styles.iconoMini} />
            <span>
              <strong>Calidad de datos:</strong> {sinArea.length}{' '}
              {sinArea.length === 1 ? 'proyecto no declara' : 'proyectos no declaran'} su área
              ({sinArea.map((p) => p.nombre).join(', ')}). Se muestran en la fila «sin área»;
              completa el área en el repositorio del proyecto para clasificarlos.
            </span>
          </p>
        )}

        <div className={styles.grid}>
          <section id="salud-modelos" className={`${styles.panel} ${styles.ancho}`}>
            <h2 className={styles.panelTitulo}>Salud documental por modelo</h2>
            <p className={styles.hint}>
              Del menor al mayor puntaje. Líneas en 50 y 80: umbrales de crítico, atención y saludable.
            </p>
            <Ranking modelos={modelos} />
          </section>
          <section className={styles.panel}>
            <h2 className={styles.panelTitulo}>Proyectos por área y estado</h2>
            <p className={styles.hint}>La leyenda indica la cantidad de proyectos. Selecciona una celda para verlos.</p>
            <Matriz />
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitulo}>Actividad reciente</h2>
            <p className={styles.hint}>Últimos cambios de documentación y releases en todo el portafolio.</p>
            <Actividad />
          </section>


        </div>
       </div>
      </main>
    </Layout>
  );
}
