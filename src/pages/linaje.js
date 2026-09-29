import React, {useEffect, useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {useHistory, useLocation} from '@docusaurus/router';
import catalog from '@site/src/data/catalog.json';
import {SaludBadge} from '@site/src/components/Salud';
import {NIVELES} from '@site/src/lib/salud';
import {construirGrafo, vecinos, nombreCorto} from '@site/src/lib/linaje';
import styles from './linaje.module.css';

// Geometría del grafo bipartito (unidades del viewBox; el SVG escala al ancho disponible).
const ANCHO = 820;
const FILA = 34;
const NODO_H = 24;
const PAD = 16;
const TABLA_X0 = 8;
const TABLA_X1 = 262;
const MODELO_X0 = 520;
const MODELO_X1 = 812;

/** Posiciona tablas (una por fila) y modelos (agrupados por proyecto, con fila de encabezado). */
function layout(grafo) {
  const filasModelo = [];
  let proyectoPrevio = null;
  for (const m of grafo.modelos) {
    if (m.proyecto.slug !== proyectoPrevio) {
      filasModelo.push({tipo: 'grupo', proyecto: m.proyecto});
      proyectoPrevio = m.proyecto.slug;
    }
    filasModelo.push({tipo: 'modelo', modelo: m});
  }
  const nFilas = Math.max(grafo.tablas.length, filasModelo.length);
  const alto = nFilas * FILA + PAD * 2;
  const offTablas = ((nFilas - grafo.tablas.length) * FILA) / 2;
  const offModelos = ((nFilas - filasModelo.length) * FILA) / 2;

  const yTabla = new Map(grafo.tablas.map((t, i) => [t.id, PAD + offTablas + i * FILA + FILA / 2]));
  const yModelo = new Map();
  const grupos = [];
  filasModelo.forEach((f, i) => {
    const y = PAD + offModelos + i * FILA + FILA / 2;
    if (f.tipo === 'grupo') grupos.push({y, proyecto: f.proyecto});
    else yModelo.set(f.modelo.id, y);
  });
  return {alto, yTabla, yModelo, grupos};
}

function curva(y1, y2) {
  const mx = (TABLA_X1 + MODELO_X0) / 2;
  return `M${TABLA_X1},${y1} C${mx},${y1} ${mx},${y2} ${MODELO_X0},${y2}`;
}

function activar(e, fn) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn();
  }
}

function Grafo({grafo, activo, sel, onSel, onHover}) {
  const {alto, yTabla, yModelo, grupos} = useMemo(() => layout(grafo), [grafo]);
  const atenuado = (set, id) => activo && !set.has(id);

  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${ANCHO} ${alto}`}
      role="group"
      aria-label="Grafo de linaje: tablas fuente a la izquierda, modelos a la derecha"
      onMouseLeave={() => onHover(null)}
    >
      <g>
        {grafo.aristas.map((a) => {
          const on = activo && activo.tablas.has(a.tabla) && activo.modelos.has(a.modelo);
          return (
            <path
              key={`${a.tabla}>${a.modelo}`}
              d={curva(yTabla.get(a.tabla), yModelo.get(a.modelo))}
              className={on ? styles.aristaOn : activo ? styles.aristaOff : styles.arista}
            />
          );
        })}
      </g>

      {grupos.map((g) => (
        <text key={g.proyecto.slug} x={MODELO_X0 + 4} y={g.y + 5} className={styles.grupo}>
          {g.proyecto.nombre}
        </text>
      ))}

      {grafo.tablas.map((t) => {
        const y = yTabla.get(t.id);
        const elegido = sel && sel.tipo === 'tabla' && sel.id === t.id;
        const toggle = () => onSel(elegido ? null : {tipo: 'tabla', id: t.id});
        return (
          <g
            key={t.id}
            className={`${styles.nodo} ${atenuado(activo ? activo.tablas : null, t.id) ? styles.dim : ''}`}
            tabIndex={0}
            role="button"
            aria-pressed={elegido}
            aria-label={`Tabla ${t.id}, usada por ${t.modelos.length} modelos`}
            onClick={toggle}
            onKeyDown={(e) => activar(e, toggle)}
            onMouseEnter={() => onHover({tipo: 'tabla', id: t.id})}
            onFocus={() => onHover({tipo: 'tabla', id: t.id})}
          >
            <title>{t.id}</title>
            <rect
              x={TABLA_X0} y={y - NODO_H / 2} width={TABLA_X1 - TABLA_X0} height={NODO_H} rx={6}
              className={elegido ? styles.rectSel : styles.rect}
            />
            <text x={TABLA_X0 + 12} y={y + 4} className={styles.cuenta}>{t.modelos.length}</text>
            <text x={TABLA_X1 - 10} y={y + 4} textAnchor="end" className={styles.etiqueta}>
              {nombreCorto(t.id)}
            </text>
          </g>
        );
      })}

      {grafo.modelos.map((m) => {
        const y = yModelo.get(m.id);
        const elegido = sel && sel.tipo === 'modelo' && sel.id === m.id;
        const toggle = () => onSel(elegido ? null : {tipo: 'modelo', id: m.id});
        const n = m.salud ? NIVELES[m.salud.nivel] : null;
        return (
          <g
            key={m.id}
            className={`${styles.nodo} ${atenuado(activo ? activo.modelos : null, m.id) ? styles.dim : ''}`}
            tabIndex={0}
            role="button"
            aria-pressed={elegido}
            aria-label={`Modelo ${m.nombre} de ${m.proyecto.nombre}${m.salud ? `, salud ${m.salud.score}` : ''}`}
            onClick={toggle}
            onKeyDown={(e) => activar(e, toggle)}
            onMouseEnter={() => onHover({tipo: 'modelo', id: m.id})}
            onFocus={() => onHover({tipo: 'modelo', id: m.id})}
          >
            <title>{`${m.nombre} · ${m.proyecto.nombre}`}</title>
            <rect
              x={MODELO_X0} y={y - NODO_H / 2} width={MODELO_X1 - MODELO_X0} height={NODO_H} rx={6}
              className={elegido ? styles.rectSel : styles.rect}
            />
            <text x={MODELO_X0 + 12} y={y + 4} className={styles.etiqueta}>{m.nombre}</text>
            {n && (
              <>
                <text x={MODELO_X1 - 26} y={y + 4} textAnchor="end" className={styles.score}>
                  {m.salud.score}
                </text>
                <circle cx={MODELO_X1 - 14} cy={y} r={4.5} fill={n.color} />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function LinkModelo({m}) {
  const href = useBaseUrl(`/proyecto/${m.proyecto.slug}`) + `#modelo-${m.nombre}`;
  return <a href={href} className={styles.mono}>{m.nombre}</a>;
}

function Impacto({grafo, sel, onSel}) {
  if (!sel) {
    const criticas = grafo.tablas.slice(0, 5);
    return (
      <aside className={styles.panel}>
        <h2 className={styles.panelTitulo}>Análisis de impacto</h2>
        <p className={styles.hint}>
          Elige una tabla para ver qué modelos se afectan si cambia o se cae. También puedes elegir
          un modelo para ver de qué tablas depende.
        </p>
        <h3 className={styles.panelSub}>Tablas con más dependientes</h3>
        <ul className={styles.lista}>
          {criticas.map((t) => (
            <li key={t.id}>
              <button className={styles.linkBtn} onClick={() => onSel({tipo: 'tabla', id: t.id})}>
                {nombreCorto(t.id)}
              </button>
              <span className={styles.meta}>
                {t.modelos.length} modelos · {t.proyectos.length} proyectos
              </span>
            </li>
          ))}
        </ul>
      </aside>
    );
  }

  if (sel.tipo === 'modelo') {
    const m = grafo.modelos.find((x) => x.id === sel.id);
    if (!m) return null;
    return (
      <aside className={styles.panel}>
        <p className={styles.eyebrow}>Modelo · {m.proyecto.nombre}</p>
        <h2 className={`${styles.panelTitulo} ${styles.mono}`}>{m.nombre}</h2>
        {m.salud && <SaludBadge salud={m.salud} />}
        <h3 className={styles.panelSub}>Depende de {m.tablas.length} tablas</h3>
        <ul className={styles.lista}>
          {m.tablas.map((t) => (
            <li key={t}>
              <button className={styles.linkBtn} onClick={() => onSel({tipo: 'tabla', id: t})}>
                {nombreCorto(t)}
              </button>
            </li>
          ))}
        </ul>
        <p className={styles.panelPie}><LinkModelo m={m} /> → ver detalle</p>
      </aside>
    );
  }

  const t = grafo.tablas.find((x) => x.id === sel.id);
  if (!t) return null;
  const afectados = grafo.modelos.filter((m) => t.modelos.includes(m.id));
  const enProd = afectados.filter((m) => m.proyecto.estado === 'produccion').length;
  const criticos = afectados.filter((m) => m.salud && m.salud.nivel === 'critico').length;
  const porProyecto = t.proyectos.map((slug) => afectados.filter((m) => m.proyecto.slug === slug));

  return (
    <aside className={styles.panel} aria-live="polite">
      <p className={styles.eyebrow}>Si cambia esta tabla</p>
      <h2 className={`${styles.panelTitulo} ${styles.mono}`} title={t.id}>{nombreCorto(t.id)}</h2>
      <div className={styles.kpis}>
        <div><strong>{afectados.length}</strong><span>modelos</span></div>
        <div><strong>{t.proyectos.length}</strong><span>proyectos</span></div>
        <div><strong>{enProd}</strong><span>en producción</span></div>
        <div><strong>{criticos}</strong><span>con salud crítica</span></div>
      </div>
      {porProyecto.map((ms) => (
        <div key={ms[0].proyecto.slug} className={styles.grupoPanel}>
          <h3 className={styles.panelSub}>{ms[0].proyecto.nombre}</h3>
          <ul className={styles.lista}>
            {ms.map((m) => (
              <li key={m.id}>
                <LinkModelo m={m} />
                {m.salud && <SaludBadge salud={m.salud} conEtiqueta={false} />}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
}

/** Lista para pantallas angostas: el grafo no se lee a 400px, la misma relación sí. */
function ListaMovil({grafo, onSel}) {
  return (
    <ul className={styles.listaMovil}>
      {grafo.tablas.map((t) => (
        <li key={t.id}>
          <button className={styles.linkBtn} onClick={() => onSel({tipo: 'tabla', id: t.id})}>
            {nombreCorto(t.id)}
          </button>
          <span className={styles.meta}>{t.modelos.length} modelos · {t.proyectos.length} proyectos</span>
        </li>
      ))}
    </ul>
  );
}

function leerSeleccion(search) {
  const q = new URLSearchParams(search);
  if (q.get('tabla')) return {tipo: 'tabla', id: q.get('tabla')};
  if (q.get('modelo')) return {tipo: 'modelo', id: q.get('modelo')};
  return null;
}

export default function Linaje() {
  const grafo = useMemo(() => construirGrafo(catalog), []);
  const location = useLocation();
  const history = useHistory();
  const [sel, setSel] = useState(() => leerSeleccion(location.search));
  const [hover, setHover] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => setSel(leerSeleccion(location.search)), [location.search]);

  const elegir = (s) => {
    setSel(s);
    const q = s ? `?${s.tipo}=${encodeURIComponent(s.id)}` : '';
    history.replace({pathname: location.pathname, search: q});
    // en angosto el panel queda debajo de la lista: llevar la vista al resultado
    if (s && window.matchMedia('(max-width: 996px)').matches) {
      document.getElementById('impacto').scrollIntoView({behavior: 'smooth', block: 'start'});
    }
  };

  const coincidencias = busqueda.trim()
    ? grafo.tablas.filter((t) => t.id.toLowerCase().includes(busqueda.trim().toLowerCase())).slice(0, 6)
    : [];
  const activo = vecinos(grafo, hover || sel);

  return (
    <Layout title="Linaje" description="Linaje global: qué modelos dependen de cada tabla">
      <div className={styles.page}>
       <div className={styles.pageInner}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>Linaje global</p>
          <h1 className={styles.titulo}>¿Qué se rompe si cambia una tabla?</h1>
          <p className={styles.sub}>
            {grafo.tablas.length} tablas fuente alimentan {grafo.modelos.length} modelos.{' '}
            {grafo.compartidas} {grafo.compartidas === 1 ? 'tabla es compartida' : 'tablas son compartidas'} entre
            proyectos: un cambio ahí impacta a más de un equipo.
          </p>
          <form
            className={styles.buscador}
            onSubmit={(e) => {
              e.preventDefault();
              if (coincidencias[0]) {
                elegir({tipo: 'tabla', id: coincidencias[0].id});
                setBusqueda('');
              }
            }}
          >
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar tabla (ej. hm_clientes)"
              aria-label="Buscar tabla"
            />
            {coincidencias.length > 0 && (
              <ul className={styles.sugerencias}>
                {coincidencias.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={() => {
                        elegir({tipo: 'tabla', id: t.id});
                        setBusqueda('');
                      }}
                    >
                      {t.id}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>
        </header>

        {grafo.tablas.length === 0 ? (
          <p className={styles.hint}>Ningún modelo declara todavía su linaje (sources.table_list).</p>
        ) : (
          <div className={styles.cuerpo}>
            <div className={styles.lienzo}>
              <div className={styles.columnas} aria-hidden="true">
                <span>Tablas fuente <em>· nº de modelos</em></span>
                <span>Modelos <em>· salud</em></span>
              </div>
              <Grafo grafo={grafo} activo={activo} sel={sel} onSel={elegir} onHover={setHover} />
              <ListaMovil grafo={grafo} onSel={elegir} />
            </div>
            <div id="impacto">
              <Impacto grafo={grafo} sel={sel} onSel={elegir} />
            </div>
          </div>
        )}
       </div>
      </div>
    </Layout>
  );
}
