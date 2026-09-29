import React, {useEffect, useState} from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {useLocation} from '@docusaurus/router';
import Icon from '@site/src/components/Icon';
import EstadoTag from '@site/src/components/EstadoTag';
import {SaludBadge, SaludDetalle, SaludExplicacion} from '@site/src/components/Salud';
import Identifier from '@site/src/components/Identifier';
import ModelCardHelp from '@site/src/components/ModelCardHelp';
import {NIVELES} from '@site/src/lib/salud';
import {describirEvento} from '@site/src/lib/eventos';
import styles from './styles.module.css';

/** Markdown inline mínimo (**negrita**, `código`): la narrativa solo usa esos dos. */
function renderInlineMd(texto) {
  const partes = texto.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return partes.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i}>{p.slice(1, -1)}</code>;
    return p;
  });
}

function fmtFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-PE', {year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'});
}

const DOCS_META = {
  'model-card': {label: 'Model Card', icon: 'model'},
  lineage: {label: 'Linaje', icon: 'lineage'},
  functions: {label: 'Funciones', icon: 'functions'},
};

function DocCheck({projectSlug, modeloNombre, doc, presente}) {
  const meta = DOCS_META[doc] || {label: doc, icon: 'doc'};
  const href = useBaseUrl(`/docs/${projectSlug}/${modeloNombre}/${doc}`);
  return (
    <li className={presente ? styles.docOk : styles.docMissing}>
      <Icon name={meta.icon} className={styles.docIcono} />
      {presente ? <a href={href}>{meta.label}</a> : <span>{meta.label}</span>}
      {!presente && <span className={styles.docPendiente}>falta</span>}
    </li>
  );
}

/** Mini-ranking arriba del detalle: la salud de cada modelo, enlazada a su bloque (R10). */
function SaludModelos({modelos, onIr}) {
  return (
    <ul className={styles.saludLista}>
      {modelos.map((m) => {
        const n = m.salud ? NIVELES[m.salud.nivel] : null;
        return (
          <li key={m.nombre}>
            <a href={`#modelo-${m.nombre}`} className={styles.saludFila} onClick={() => onIr(m.nombre)}>
              <span className={styles.saludNombre} title={m.nombre}>{m.nombre}</span>
              <span className={styles.saludBarra}>
                {n && <span style={{width: `${Math.max(m.salud.score, 1)}%`, background: n.color}} />}
              </span>
              {n && (
                <span className={styles.saludScore} style={{color: n.color}}>
                  <Icon name={n.icon} className={styles.iconoMini} />
                  {m.salud.score}/100
                </span>
              )}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function Modelo({projectSlug, repoUrl, m, abierto, onToggle}) {
  const tablas = (m.sources && m.sources.table_list) || [];
  const dinfo = (m.sources && m.sources.dataset_info) || {};
  const linajeHref = useBaseUrl('/linaje');
  const cardHref = useBaseUrl(m.doc_url || '/');
  const presentes = m.docs_presentes || [];
  // sin narrativa la columna de texto queda casi vacía: la salud (qué falta) va primero, a lo ancho
  const sinNarrativa = !m.resumen_proposito && !m.resumen_como_funciona;
  const esperados = m.docs_esperados || [];
  const meta = [
    m.algoritmo && ['Algoritmo', `${m.algoritmo}${m.flavour && m.flavour.toLowerCase() !== m.algoritmo.toLowerCase() ? ` · ${m.flavour}` : ''}`],
    typeof m.auc === 'number' && ['AUC', m.auc.toFixed(3)],
    m.features != null && ['Features', m.features],
    ['Tablas fuente', m.n_tablas],
    ['Versión', m.version ? `v${m.version}` : '—'],
  ].filter(Boolean);

  return (
    <details
      className={styles.modelo}
      id={`modelo-${m.nombre}`}
      open={abierto}
      onToggle={(e) => onToggle(m.nombre, e.currentTarget.open)}
    >
      <summary className={styles.modeloSummary}>
        <span className={styles.modeloNombre}>{m.nombre}</span>
        <span className={styles.modeloDocs}>{presentes.filter((d) => esperados.includes(d)).length}/{esperados.length} docs</span>
        <SaludBadge salud={m.salud} />
        <span className={styles.chevron} aria-hidden="true">▸</span>
      </summary>

      <div className={`${styles.modeloCuerpo} ${sinNarrativa ? styles.sinNarrativa : ''}`}>
        <div className={styles.modeloCol}>
          {m.resumen_proposito || m.resumen_como_funciona ? (
            <>
              {m.resumen_proposito && <p className={styles.texto}>{renderInlineMd(m.resumen_proposito)}</p>}
              {m.resumen_como_funciona && (
                <>
                  <h4 className={styles.subtitulo}>Cómo funciona</h4>
                  <p className={styles.texto}>{renderInlineMd(m.resumen_como_funciona)}</p>
                </>
              )}
            </>
          ) : (
            <p className={styles.vacio}>
              Este modelo todavía no tiene una descripción de su propósito y funcionamiento.
            </p>
          )}

          <div className={styles.identificador}><Identifier value={m.nombre} copy /></div>
          {sinNarrativa && presentes.includes('model-card') && !m.drift && <ModelCardHelp repoUrl={repoUrl} />}

          <dl className={styles.meta}>
            {meta.map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>

          <div className={styles.acciones}>
            {m.doc_url && <a className={styles.btn} href={cardHref}>Abrir Model Card →</a>}
            <ul className={styles.docList} aria-label="Documentación">
              {esperados.map((d) => (
                <DocCheck key={d} projectSlug={projectSlug} modeloNombre={m.nombre} doc={d} presente={presentes.includes(d)} />
              ))}
            </ul>
          </div>

          {tablas.length > 0 && (
            <>
              <h4 className={styles.subtitulo}>Tablas fuente</h4>
              <ul className={styles.tablas}>
                {tablas.map((t) => (
                  <li key={t}>
                    <a href={`${linajeHref}?tabla=${encodeURIComponent(t)}`} title="Ver qué otros modelos usan esta tabla">
                      <code>{t}</code>
                    </a>
                    {dinfo[t] && <span className={styles.columnas}>{dinfo[t].join(', ')}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className={styles.modeloCol}>
          <SaludDetalle salud={m.salud} drift={m.drift} repoUrl={repoUrl} />
        </div>
      </div>
    </details>
  );
}

/** Con 1–2 modelos, todos abiertos; con más, solo el de peor salud (R11). */
function abiertosIniciales(modelos) {
  if (modelos.length <= 2) return Object.fromEntries(modelos.map((m) => [m.nombre, true]));
  const peor = [...modelos].sort((a, b) => (a.salud ? a.salud.score : 101) - (b.salud ? b.salud.score : 101))[0];
  return {[peor.nombre]: true};
}

export default function ProjectDetail({project: p}) {
  const modelos = p.modelos || [];
  const location = useLocation();
  const [abiertos, setAbiertos] = useState(() => abiertosIniciales(modelos));
  const toggle = (nombre, abierto) => setAbiertos((a) => (a[nombre] === abierto ? a : {...a, [nombre]: abierto}));

  // llegar con #modelo-x (desde "Requiere atención" o el mini-ranking) abre ese bloque
  const ir = (nombre) => setAbiertos((a) => ({...a, [nombre]: true}));
  useEffect(() => {
    const m = location.hash.match(/^#modelo-(.+)$/);
    if (!m) return;
    const nombre = decodeURIComponent(m[1]);
    ir(nombre);
    requestAnimationFrame(() => {
      const el = document.getElementById(`modelo-${nombre}`);
      if (el) el.scrollIntoView({block: 'start'});
    });
  }, [location.hash]);

  const historial = p.historial || [];

  return (
    <Layout title={p.nombre} description={`Detalle de ${p.nombre}`}>
      <main className={styles.page}>
       <div className={styles.pageInner}>
        <nav className={styles.breadcrumb} aria-label="Ruta">
          <a href={useBaseUrl('/')}>Dashboard</a> <span aria-hidden="true">/</span> <span>{p.nombre}</span>
        </nav>

        <header className={styles.head}>
          <div className={styles.headMeta}>
            <EstadoTag estado={p.estado} />
            {p.area && <span className={styles.mono}>{p.area}</span>}
          </div>
          <h1 className={styles.titulo}>{p.nombre}</h1>
          <p className={styles.headSub}>
            {modelos.length} {modelos.length === 1 ? 'modelo' : 'modelos'} · {p.modelos_completos}/{modelos.length} con doc completa ·{' '}
            <a href={p.repo_url} target="_blank" rel="noopener">Repositorio ↗</a>
          </p>
        </header>

        <SaludExplicacion />

        <div className={`${styles.resumenGrid} ${modelos.length > 1 ? '' : styles.unaColumna}`}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitulo}>¿Qué es este proyecto?</h2>
            {p.resumen_proyecto ? (
              p.resumen_proyecto.split('\n\n').map((parrafo, i) => (
                <p key={i} className={styles.texto}>{renderInlineMd(parrafo)}</p>
              ))
            ) : (
              <p className={styles.vacio}>
                El README del repo todavía no tiene una introducción. Escríbela antes del primer
                subtítulo y aparecerá aquí.
              </p>
            )}
          </section>
          {modelos.length > 1 && (
            <section className={styles.panel}>
              <h2 className={styles.panelTitulo}>Salud documental de los modelos</h2>
              <SaludModelos modelos={modelos} onIr={ir} />
            </section>
          )}
        </div>

        <section>
          <h2 id="modelos" className={styles.seccionTitulo}>Modelos ({modelos.length})</h2>
          <div className={styles.modelos}>
            {modelos.map((m) => (
              <Modelo key={m.nombre} projectSlug={p.slug} repoUrl={p.repo_url} m={m} abierto={!!abiertos[m.nombre]} onToggle={toggle} />
            ))}
          </div>
        </section>

        <details className={styles.historico}>
          <summary>
            <Icon name="clock" className={styles.iconoMini} /> Histórico <span className={styles.mono}>({historial.length})</span>
            <span className={styles.hint}>Cambios de documentación y releases, del más reciente al más antiguo</span>
          </summary>
          {historial.length > 0 ? (
            <ul className={styles.timeline}>
              {historial.map((e, i) => (
                <li key={i} className={styles.tlItem}>
                  <span className={`${styles.tlDot} ${e.tipo === 'release' ? styles.tlDotRelease : ''}`} />
                  <span className={styles.tlFecha}>{fmtFecha(e.fecha)}</span>
                  <a href={e.url} target="_blank" rel="noopener" title={e.detalle}>{describirEvento(e)}</a>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.vacio}>Sin eventos registrados todavía.</p>
          )}
        </details>
       </div>
      </main>
    </Layout>
  );
}
