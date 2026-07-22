import React from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Icon from '@site/src/components/Icon';
import styles from './styles.module.css';

const ESTADOS = {
  produccion: {label: 'Producción', cls: styles.dotGreen},
  desarrollo: {label: 'Desarrollo', cls: styles.dotAmber},
  nuevo: {label: 'Nuevo', cls: styles.dotSlate},
};

/**
 * Renderiza markdown inline mínimo (**negrita**, `código`) sin traer una librería de markdown
 * completa — la narrativa del Model Card solo usa estos dos, generados por la plantilla/skill.
 */
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
  return new Date(iso).toLocaleDateString('es-PE', {year: 'numeric', month: 'short', day: 'numeric'});
}

function Metric({label, value}) {
  if (value === null || value === undefined) return null;
  return (
    <div className={styles.metric}>
      <div className={styles.metricValue}>{value}</div>
      <div className={styles.metricLabel}>{label}</div>
    </div>
  );
}

const DOCS_META = {
  'model-card': {label: 'Model Card', icon: 'model'},
  lineage: {label: 'Linaje', icon: 'lineage'},
  functions: {label: 'Funciones', icon: 'functions'},
};

function DocCheck({projectSlug, doc, presente}) {
  const meta = DOCS_META[doc] || {label: doc, icon: 'doc'};
  const href = useBaseUrl(`/docs/${projectSlug}/${doc}`);
  if (presente) {
    return (
      <li className={styles.docOk}>
        <span className={styles.docIcon}>✓</span>
        <Icon name={meta.icon} className={styles.docTypeIcon} />
        <a className={styles.docLink} href={href}>{meta.label}</a>
      </li>
    );
  }
  return (
    <li className={styles.docMissing}>
      <span className={styles.docIcon}>○</span>
      <Icon name={meta.icon} className={styles.docTypeIcon} />
      {meta.label} <span className={styles.docPendingTag}>pendiente</span>
    </li>
  );
}

function TimelineItem({e}) {
  const esRelease = e.tipo === 'release';
  return (
    <li className={styles.tlItem}>
      <span className={`${styles.tlDot} ${esRelease ? styles.tlDotRelease : styles.tlDotDoc}`} />
      <div className={styles.tlBody}>
        <div className={styles.tlMeta}>
          <span className={styles.tlTag}>{esRelease ? 'release' : 'doc'}</span>
          <span className={styles.tlDate}>{fmtFecha(e.fecha)}</span>
        </div>
        <a className={styles.tlDetail} href={e.url} target="_blank" rel="noopener">
          {e.detalle}
        </a>
      </div>
    </li>
  );
}

export default function ProjectDetail({project: p}) {
  const est = ESTADOS[p.estado] || ESTADOS.nuevo;
  const docHref = useBaseUrl(p.doc_url || '/docs/intro');
  const tablas = (p.sources && p.sources.table_list) || [];
  const dinfo = (p.sources && p.sources.dataset_info) || {};

  return (
    <Layout title={p.nombre} description={`Detalle de ${p.nombre}`}>
      <div className={styles.page}>
        <div className={styles.breadcrumb}>
          <a href={useBaseUrl('/')}>Dashboard</a> <span>／</span> <span>{p.nombre}</span>
        </div>

        <header className={styles.head}>
          <div className={styles.headTop}>
            <span className={`${styles.dot} ${est.cls}`} />
            <span className={styles.estado}>{est.label}</span>
            <span className={styles.area}>{p.area}</span>
          </div>
          <h1 className={styles.title}>{p.nombre}</h1>
          <div className={styles.actions}>
            <a className={styles.btnPrimary} href={docHref}>Ver Model Card →</a>
            <a className={styles.btnGhost} href={p.repo_url} target="_blank" rel="noopener">
              Repositorio ↗
            </a>
          </div>
        </header>

        <section className={styles.summary}>
          <h2 className={styles.summaryTitle}>¿Qué es este proyecto?</h2>
          {p.resumen_proposito || p.resumen_como_funciona ? (
            <>
              {p.resumen_proposito && (
                <p className={styles.summaryText}>{renderInlineMd(p.resumen_proposito)}</p>
              )}
              {p.resumen_como_funciona && (
                <>
                  <h3 className={styles.summarySubTitle}>Cómo funciona</h3>
                  <p className={styles.summaryText}>{renderInlineMd(p.resumen_como_funciona)}</p>
                </>
              )}
            </>
          ) : (
            <p className={styles.summaryEmpty}>
              Este proyecto todavía no tiene una narrativa documentada. Corré la skill de autodoc
              (<code>/generar-model-card</code>) en el repo para completar propósito y funcionamiento.
            </p>
          )}
        </section>

        <section className={styles.metrics}>
          <Metric label="algoritmo" value={p.algoritmo} />
          <Metric label="flavour" value={p.flavour} />
          <Metric label="AUC" value={typeof p.auc === 'number' ? p.auc.toFixed(3) : null} />
          <Metric label="features" value={p.features} />
          <Metric label="tablas fuente" value={p.n_tablas} />
          <Metric label="completitud" value={`${p.completitud}%`} />
        </section>

        <div className={styles.grid}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}><Icon name="doc" className={styles.cardTitleIcon} /> Documentación</h2>
            <ul className={styles.docList}>
              {(p.docs_esperados || []).map((d) => (
                <DocCheck
                  key={d}
                  projectSlug={p.slug}
                  doc={d}
                  presente={(p.docs_presentes || []).includes(d)}
                />
              ))}
            </ul>
            {tablas.length > 0 && (
              <>
                <h3 className={styles.subTitle}>Linaje</h3>
                <ul className={styles.tableList}>
                  {tablas.map((t) => (
                    <li key={t}>
                      <code>{t}</code>
                      {dinfo[t] && <span className={styles.tableCols}> — {dinfo[t].join(', ')}</span>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}><Icon name="clock" className={styles.cardTitleIcon} /> Histórico</h2>
            <p className={styles.hint}>
              Derivado de commits a <code>docs/</code> y tags/releases del repo — no es un snapshot
              guardado, se recalcula en cada build.
            </p>
            {p.historial && p.historial.length > 0 ? (
              <ul className={styles.timeline}>
                {p.historial.map((e, i) => (
                  <TimelineItem key={i} e={e} />
                ))}
              </ul>
            ) : (
              <p className={styles.hint}>Sin eventos registrados todavía.</p>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
}
