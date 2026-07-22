import React, {useState, useMemo} from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import catalog from '@site/src/data/catalog.json';
import styles from './index.module.css';

const ESTADOS = {
  produccion: {label: 'Producción', cls: styles.dotGreen},
  desarrollo: {label: 'Desarrollo', cls: styles.dotAmber},
  nuevo: {label: 'Nuevo', cls: styles.dotSlate},
};

function Stat({valor, label}) {
  return (
    <div className={styles.stat}>
      <div className={styles.statValue}>{valor}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

function Chip({k, v}) {
  if (v === null || v === undefined || v === '') return null;
  return (
    <span className={styles.chip}>
      <span className={styles.chipK}>{k}</span>
      <span className={styles.chipV}>{v}</span>
    </span>
  );
}

function Card({p}) {
  const est = ESTADOS[p.estado] || ESTADOS.nuevo;
  const detalleHref = useBaseUrl(`/proyecto/${p.slug}`);
  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <span className={`${styles.dot} ${est.cls}`} />
        <span className={styles.estado}>{est.label}</span>
        <span className={styles.area}>{p.area}</span>
      </div>
      <h3 className={styles.cardTitle}>
        <a href={detalleHref} className={styles.cardTitleLink}>{p.nombre}</a>
      </h3>

      <div className={styles.completeness}>
        <div className={styles.compBar}>
          <span style={{width: `${p.completitud}%`}} />
        </div>
        <span className={styles.compPct}>{p.completitud}% doc</span>
      </div>

      <div className={styles.chips}>
        <Chip k="algo" v={p.algoritmo} />
        <Chip k="AUC" v={typeof p.auc === 'number' ? p.auc.toFixed(3) : null} />
        <Chip k="features" v={p.features} />
        <Chip k="tablas" v={p.n_tablas} />
      </div>

      <div className={styles.links}>
        <a className={styles.btnPrimary} href={detalleHref}>Ver detalle →</a>
        <a className={styles.btnGhost} href={p.repo_url} target="_blank" rel="noopener">Repo ↗</a>
      </div>
    </article>
  );
}

export default function Home() {
  const [area, setArea] = useState('');
  const [estado, setEstado] = useState('');

  const areas = useMemo(() => [...new Set(catalog.map((p) => p.area).filter(Boolean))].sort(), []);
  const filtrados = catalog.filter(
    (p) => (!area || p.area === area) && (!estado || p.estado === estado),
  );
  const completos = catalog.filter((p) => p.completitud === 100).length;
  const enProd = catalog.filter((p) => p.estado === 'produccion').length;

  return (
    <Layout title="Dashboard" description="Knowledge Center — documentación viva de todos los proyectos">
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>COE · MODELOS</span>
          <h1 className={styles.heroTitle}>Knowledge Center</h1>
          <p className={styles.heroSub}>
            Documentación viva de cada proyecto — Model Cards, linaje y funciones, computados en vivo
            desde los repos.
          </p>
          <div className={styles.stats}>
            <Stat valor={catalog.length} label="proyectos" />
            <Stat valor={completos} label="con doc completa" />
            <Stat valor={enProd} label="en producción" />
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.filters}>
          <select value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">Todas las áreas</option>
            {areas.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="produccion">Producción</option>
            <option value="desarrollo">Desarrollo</option>
            <option value="nuevo">Nuevo</option>
          </select>
          <span className={styles.count}>{filtrados.length} proyecto(s)</span>
        </div>

        {catalog.length === 0 ? (
          <p className={styles.empty}>
            Aún no hay proyectos indexados. Corre la agregación (<code>scripts/aggregate.py</code>).
          </p>
        ) : (
          <div className={styles.grid}>
            {filtrados.map((p) => (
              <Card key={p.slug} p={p} />
            ))}
          </div>
        )}
      </main>
    </Layout>
  );
}
