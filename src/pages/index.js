import React, {useState, useMemo} from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import catalog from '@site/src/data/catalog.json';
import ProgressRing from '@site/src/components/ProgressRing';
import {SaludBadge} from '@site/src/components/Salud';
import {modelosPorSalud} from '@site/src/lib/salud';
import styles from './index.module.css';

const ATENCION_VISIBLES = 5;

const ESTADOS = {
  produccion: {label: 'Producción', dot: styles.dotGreen, pill: styles.pillGreen, ring: 'var(--kc-green)'},
  desarrollo: {label: 'Desarrollo', dot: styles.dotAmber, pill: styles.pillAmber, ring: 'var(--kc-amber)'},
  nuevo: {label: 'Nuevo', dot: styles.dotSlate, pill: styles.pillSlate, ring: 'var(--kc-slate)'},
};

function Stat({valor, label}) {
  return (
    <div className={styles.stat}>
      <div className={styles.statValue}>{valor}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

function dotClaseCompletitud(completitud) {
  if (completitud === 100) return styles.dotGreen;
  if (completitud > 0) return styles.dotAmber;
  return styles.dotSlate;
}

function ModeloBadge({m}) {
  return (
    <span className={styles.modeloBadge} title={`${m.nombre} · ${m.completitud}% documentado`}>
      <span className={`${styles.dot} ${dotClaseCompletitud(m.completitud)}`} />
      {m.nombre}
    </span>
  );
}

function Card({p}) {
  const est = ESTADOS[p.estado] || ESTADOS.nuevo;
  const detalleHref = useBaseUrl(`/proyecto/${p.slug}`);
  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <ProgressRing value={p.completitud_promedio} size={46} color={est.ring} />
        <div className={styles.cardHeadText}>
          <div className={styles.cardTop}>
            <span className={`${styles.pill} ${est.pill}`}>
              <span className={`${styles.dot} ${est.dot}`} /> {est.label}
            </span>
            {p.area && <span className={styles.area}>{p.area}</span>}
          </div>
          <h3 className={styles.cardTitle}>
            <a href={detalleHref} className={styles.cardTitleLink}>{p.nombre}</a>
          </h3>
        </div>
      </div>

      <div className={styles.cardStats}>
        <div className={styles.cardStat}>
          <span className={styles.cardStatValue}>{p.n_modelos}</span>
          <span className={styles.cardStatLabel}>{p.n_modelos === 1 ? 'modelo' : 'modelos'}</span>
        </div>
        <div className={styles.cardStat}>
          <span className={styles.cardStatValue}>{p.modelos_completos}/{p.n_modelos}</span>
          <span className={styles.cardStatLabel}>con doc completa</span>
        </div>
        {p.salud && (
          <div className={styles.cardStat} title="Salud del proyecto = la de su peor modelo">
            <SaludBadge salud={p.salud} />
            <span className={styles.cardStatLabel}>salud</span>
          </div>
        )}
      </div>

      <div className={styles.modelos}>
        {p.modelos.map((m) => (
          <ModeloBadge key={m.nombre} m={m} />
        ))}
      </div>

      <div className={styles.links}>
        <a className={styles.btnPrimary} href={detalleHref}>Ver detalle →</a>
        <a className={styles.btnGhost} href={p.repo_url} target="_blank" rel="noopener">Repo ↗</a>
      </div>
    </article>
  );
}

function AtencionItem({m}) {
  const href = useBaseUrl(`/proyecto/${m.proyecto.slug}`) + `#modelo-${m.nombre}`;
  return (
    <li className={styles.atencionItem}>
      <SaludBadge salud={m.salud} conEtiqueta={false} />
      <a className={styles.atencionModelo} href={href}>{m.nombre}</a>
      <span className={styles.atencionProyecto}>{m.proyecto.nombre}</span>
      <span className={styles.atencionMotivo}>{m.salud.motivos[0]}</span>
    </li>
  );
}

/** Franja "Requiere atención": modelos no saludables, del peor al mejor (R2.5). */
function Atencion({modelos}) {
  const [todos, setTodos] = useState(false);
  if (modelos.length === 0) return null;
  const visibles = todos ? modelos : modelos.slice(0, ATENCION_VISIBLES);
  return (
    <section className={styles.atencion} aria-labelledby="atencion-titulo">
      <h2 id="atencion-titulo" className={styles.atencionTitulo}>
        Requiere atención <span className={styles.atencionCount}>{modelos.length}</span>
      </h2>
      <ul className={styles.atencionLista}>
        {visibles.map((m) => <AtencionItem key={`${m.proyecto.slug}/${m.nombre}`} m={m} />)}
      </ul>
      {modelos.length > ATENCION_VISIBLES && (
        <button className={styles.atencionMas} onClick={() => setTodos(!todos)}>
          {todos ? 'Ver menos' : `Ver los ${modelos.length - ATENCION_VISIBLES} restantes`}
        </button>
      )}
    </section>
  );
}

export default function Home() {
  const [area, setArea] = useState('');
  const [estado, setEstado] = useState('');

  const areas = useMemo(() => [...new Set(catalog.map((p) => p.area).filter(Boolean))].sort(), []);
  const filtrados = catalog.filter(
    (p) => (!area || p.area === area) && (!estado || p.estado === estado),
  );
  const completos = catalog.filter((p) => p.completitud_promedio === 100).length;
  const enProd = catalog.filter((p) => p.estado === 'produccion').length;
  const porSalud = useMemo(() => modelosPorSalud(catalog), []);
  const noSaludables = porSalud.filter((m) => m.salud.nivel !== 'saludable');
  const pctSaludables = porSalud.length
    ? Math.round((100 * (porSalud.length - noSaludables.length)) / porSalud.length)
    : 0;

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
            <Stat valor={`${pctSaludables}%`} label="modelos saludables" />
          </div>
        </div>
      </header>

      <main className={styles.main}>
       <div className={styles.mainInner}>
        <Atencion modelos={noSaludables} />
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
       </div>
      </main>
    </Layout>
  );
}
