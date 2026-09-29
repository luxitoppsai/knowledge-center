import React from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Icon from '@site/src/components/Icon';
import {SaludBadge, SaludDetalle} from '@site/src/components/Salud';
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

/**
 * Renderiza el README raíz del proyecto (texto libre del equipo dueño, no generado): encabezados
 * ``#``/``##`` como títulos, el resto como párrafos con inline mínimo. No es un parser de markdown
 * completo — alcanza para READMEs simples de propósito.
 */
function renderResumenProyecto(md) {
  let bloques = md.split(/\n\n+/).filter(Boolean);
  // el "# título" inicial del README solo repite el nombre del proyecto (ya está en el <h1> de
  // la página) — se omite para no mostrar un heading redundante.
  if (/^#\s+\S/.test(bloques[0])) bloques = bloques.slice(1);
  return bloques.map((bloque, i) => {
    const m = bloque.match(/^(#{1,6})\s+(.*)$/);
    if (m) {
      const Tag = m[1].length === 1 ? 'h3' : 'h4';
      return <Tag key={i} className={styles.summarySubTitle}>{renderInlineMd(m[2])}</Tag>;
    }
    return <p key={i} className={styles.summaryText}>{renderInlineMd(bloque.replace(/\n/g, ' '))}</p>;
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

function DocCheck({projectSlug, modeloNombre, doc, presente}) {
  const meta = DOCS_META[doc] || {label: doc, icon: 'doc'};
  const href = useBaseUrl(`/docs/${projectSlug}/${modeloNombre}/${doc}`);
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

const ESTADO_MODELO = {
  100: {label: 'Completo', cls: styles.dotGreen},
  0: {label: 'Sin documentar', cls: styles.dotSlate},
};

function estadoModelo(completitud) {
  if (completitud === 100) return ESTADO_MODELO[100];
  if (completitud === 0) return ESTADO_MODELO[0];
  return {label: 'Parcial', cls: styles.dotAmber};
}

function ModeloSection({projectSlug, m}) {
  const est = estadoModelo(m.completitud);
  const tablas = (m.sources && m.sources.table_list) || [];
  const dinfo = (m.sources && m.sources.dataset_info) || {};

  return (
    <section className={`${styles.card} ${styles.modeloCard}`} id={`modelo-${m.nombre}`}>
      <div className={styles.modeloHead}>
        <h3 className={styles.modeloTitle}>
          <span className={`${styles.dot} ${est.cls}`} /> {m.nombre}
        </h3>
        <span className={styles.modeloVersion}>v{m.version} · {m.completitud}% · {est.label}</span>
      </div>

      <SaludDetalle salud={m.salud} drift={m.drift} />

      {(m.resumen_proposito || m.resumen_como_funciona) ? (
        <>
          {m.resumen_proposito && <p className={styles.summaryText}>{renderInlineMd(m.resumen_proposito)}</p>}
          {m.resumen_como_funciona && (
            <>
              <h4 className={styles.summarySubTitle}>Cómo funciona</h4>
              <p className={styles.summaryText}>{renderInlineMd(m.resumen_como_funciona)}</p>
            </>
          )}
        </>
      ) : (
        <p className={styles.summaryEmpty}>Este modelo todavía no tiene narrativa documentada.</p>
      )}

      <div className={styles.metrics}>
        <Metric label="algoritmo" value={m.algoritmo} />
        <Metric label="flavour" value={m.flavour} />
        <Metric label="AUC" value={typeof m.auc === 'number' ? m.auc.toFixed(3) : null} />
        <Metric label="features" value={m.features} />
        <Metric label="tablas fuente" value={m.n_tablas} />
      </div>

      <h4 className={styles.subTitle}><Icon name="doc" className={styles.cardTitleIcon} /> Documentación</h4>
      <ul className={styles.docList}>
        {(m.docs_esperados || []).map((d) => (
          <DocCheck
            key={d}
            projectSlug={projectSlug}
            modeloNombre={m.nombre}
            doc={d}
            presente={(m.docs_presentes || []).includes(d)}
          />
        ))}
      </ul>

      {tablas.length > 0 && (
        <>
          <h4 className={styles.subTitle}>Linaje</h4>
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
  const modelos = p.modelos || [];

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
            {p.area && <span className={styles.area}>{p.area}</span>}
            {p.salud && <SaludBadge salud={p.salud} />}
          </div>
          <h1 className={styles.title}>{p.nombre}</h1>
          <p className={styles.headSub}>
            {modelos.length} {modelos.length === 1 ? 'modelo' : 'modelos'} · {p.modelos_completos}/{modelos.length} con doc completa
          </p>
          <div className={styles.actions}>
            <a className={styles.btnGhost} href={p.repo_url} target="_blank" rel="noopener">
              Repositorio ↗
            </a>
          </div>
        </header>

        <section className={styles.summary}>
          <h2 className={styles.summaryTitle}>¿Qué es este proyecto?</h2>
          {p.resumen_proyecto ? (
            renderResumenProyecto(p.resumen_proyecto)
          ) : (
            <p className={styles.summaryEmpty}>
              Este proyecto todavía no tiene un <code>README.md</code>/<code>README_info.md</code> en
              la raíz describiendo su propósito.
            </p>
          )}
        </section>

        <section>
          <h2 className={styles.summaryTitle}>Modelos ({modelos.length})</h2>
          <div className={styles.modelosGrid}>
            {modelos.map((m) => (
              <ModeloSection key={m.nombre} projectSlug={p.slug} m={m} />
            ))}
          </div>
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
    </Layout>
  );
}
