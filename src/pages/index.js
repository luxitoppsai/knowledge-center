import React, {useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useIsBrowser from '@docusaurus/useIsBrowser';
import {useHistory, useLocation} from '@docusaurus/router';
import catalog from '@site/src/data/catalog.json';
import Icon from '@site/src/components/Icon';
import EstadoTag from '@site/src/components/EstadoTag';
import {SaludBadge} from '@site/src/components/Salud';
import {NIVELES, modelosPorSalud} from '@site/src/lib/salud';
import {ESTADOS, ORDEN_ESTADOS} from '@site/src/lib/estado';
import styles from './index.module.css';

const ATENCION_VISIBLES = 5;
const NIVELES_ORDEN = ['critico', 'atencion', 'saludable'];
const FILTROS = ['q', 'estado', 'salud', 'area', 'orden'];

function fmtFecha(iso) {
  return new Date(iso).toLocaleDateString('es-PE', {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'});
}

/** Filtros en la URL: vistas compartibles. Se aplican tras hidratar (el HTML estático no tiene query). */
function useFiltros() {
  const location = useLocation();
  const history = useHistory();
  const isBrowser = useIsBrowser();
  const q = new URLSearchParams(isBrowser ? location.search : '');
  const valores = Object.fromEntries(FILTROS.map((f) => [f, q.get(f) || '']));
  const set = (cambios) => {
    const nq = new URLSearchParams(location.search);
    Object.entries(cambios).forEach(([k, v]) => (v ? nq.set(k, v) : nq.delete(k)));
    history.replace({pathname: location.pathname, search: nq.toString() ? `?${nq}` : ''});
  };
  const limpiar = () => history.replace({pathname: location.pathname, search: ''});
  return [valores, set, limpiar];
}

function coincide(p, texto) {
  if (!texto) return true;
  const t = texto.toLowerCase();
  return [p.nombre, p.slug, ...(p.modelos || []).map((m) => m.nombre)].some((s) =>
    (s || '').toLowerCase().includes(t),
  );
}

function Kpi({valor, label, destacado}) {
  return (
    <div className={`${styles.kpi} ${destacado ? styles.kpiDestacado : ''}`}>
      <span className={styles.kpiValor}>{valor}</span>
      <span className={styles.kpiLabel}>{label}</span>
    </div>
  );
}

function AtencionItem({m}) {
  const href = useBaseUrl(`/proyecto/${m.proyecto.slug}`) + `#modelo-${m.nombre}`;
  return (
    <li>
      <a className={styles.atencionItem} href={href}>
        <SaludBadge salud={m.salud} conEtiqueta={false} />
        <span className={styles.atencionAccion}>
          {m.salud.motivos[0]}
          {m.salud.motivos.length > 1 && (
            <span className={styles.mas} title={m.salud.motivos.slice(1).join('\n')}>
              +{m.salud.motivos.length - 1}
            </span>
          )}
        </span>
        <span className={styles.atencionDonde}>
          <span className={styles.mono}>{m.nombre}</span>
          <span className={styles.atencionProyecto}>{m.proyecto.nombre}</span>
        </span>
        <span className={styles.flecha} aria-hidden="true">→</span>
      </a>
    </li>
  );
}

/** "Requiere atención": lo siguiente que hay que hacer, del peor modelo al mejor (R9). */
function Atencion({modelos}) {
  const [todos, setTodos] = useState(false);
  if (modelos.length === 0) return null;
  const visibles = todos ? modelos : modelos.slice(0, ATENCION_VISIBLES);
  return (
    <section className={styles.atencion} aria-labelledby="atencion-titulo">
      <div className={styles.seccionHead}>
        <h2 id="atencion-titulo" className={styles.seccionTitulo}>
          Requiere atención <span className={styles.contador}>{modelos.length}</span>
        </h2>
        <span className={styles.seccionHint}>Qué hacer primero, del modelo con peor salud al mejor</span>
      </div>
      <ul className={styles.atencionLista}>
        {visibles.map((m) => <AtencionItem key={`${m.proyecto.slug}/${m.nombre}`} m={m} />)}
      </ul>
      {modelos.length > ATENCION_VISIBLES && (
        <button className={styles.verMas} onClick={() => setTodos(!todos)}>
          {todos ? 'Ver menos' : `Ver ${modelos.length - ATENCION_VISIBLES} más`}
        </button>
      )}
    </section>
  );
}

function Chip({activo, onClick, children}) {
  return (
    <button type="button" className={`${styles.chip} ${activo ? styles.chipActivo : ''}`}
      aria-pressed={activo} onClick={onClick}>
      {children}
    </button>
  );
}

function Toolbar({f, set, conteos}) {
  return (
    <div className={styles.toolbar} role="search">
      <label className={styles.buscador}>
        <Icon name="search" className={styles.buscadorIcono} />
        <input
          type="search"
          value={f.q}
          onChange={(e) => set({q: e.target.value})}
          placeholder="Buscar proyecto o modelo"
          aria-label="Buscar proyecto o modelo"
        />
      </label>

      <div className={styles.grupoChips} role="group" aria-label="Filtrar por estado">
        {ORDEN_ESTADOS.map((e) => (
          <Chip key={e} activo={f.estado === e} onClick={() => set({estado: f.estado === e ? '' : e})}>
            <Icon name={ESTADOS[e].icon} className={styles.chipIcono} />
            {ESTADOS[e].label} <span className={styles.chipN}>{conteos.estado[e] || 0}</span>
          </Chip>
        ))}
      </div>

      <div className={styles.grupoChips} role="group" aria-label="Filtrar por salud">
        {NIVELES_ORDEN.map((n) => (
          <Chip key={n} activo={f.salud === n} onClick={() => set({salud: f.salud === n ? '' : n})}>
            <Icon name={NIVELES[n].icon} className={styles.chipIcono} style={{color: NIVELES[n].color}} />
            {NIVELES[n].label} <span className={styles.chipN}>{conteos.salud[n] || 0}</span>
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Selects({f, set, areas}) {
  return (
    <div className={styles.selects}>
      <select value={f.area} onChange={(e) => set({area: e.target.value})} aria-label="Área">
        <option value="">Todas las áreas</option>
        {areas.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
      <select value={f.orden} onChange={(e) => set({orden: e.target.value})} aria-label="Orden">
        <option value="">Peor salud primero</option>
        <option value="nombre">Nombre (A–Z)</option>
      </select>
    </div>
  );
}

function ModeloChip({m}) {
  const n = m.salud ? NIVELES[m.salud.nivel] : null;
  return (
    <li className={styles.modeloChip} title={m.salud ? `${m.nombre} · salud ${m.salud.score} (${n.label})` : m.nombre}>
      {n && <span className={styles.punto} style={{background: n.color}} />}
      {m.nombre}
    </li>
  );
}

/** Card de proyecto (R8): toda clicable, la salud como cifra principal. */
function Card({p}) {
  const href = useBaseUrl(`/proyecto/${p.slug}`);
  const n = p.salud ? NIVELES[p.salud.nivel] : null;
  const conDrift = (p.modelos || []).filter((m) => m.drift).length;
  const resumen = [
    `${p.n_modelos} ${p.n_modelos === 1 ? 'modelo' : 'modelos'}`,
    `${p.modelos_completos}/${p.n_modelos} con doc completa`,
    conDrift ? `${conDrift} Model Card desactualizado${conDrift > 1 ? 's' : ''}` : null,
  ].filter(Boolean);

  return (
    <article className={styles.card}>
      <a className={styles.cardLink} href={href} aria-label={`Ver ${p.nombre}`} />
      <div className={styles.cardMeta}>
        <EstadoTag estado={p.estado} />
        {p.area && <span className={styles.mono}>{p.area}</span>}
      </div>
      <h3 className={styles.cardTitulo}>{p.nombre}</h3>

      {n ? (
        <div className={styles.cardSalud} title="Salud del proyecto = la de su peor modelo">
          <span className={styles.saludScore} style={{color: n.color}}>
            <Icon name={n.icon} className={styles.saludIcono} />
            {p.salud.score}
          </span>
          <strong className={styles.saludTexto}>{n.label}</strong>
        </div>
      ) : (
        <p className={styles.cardVacio}>Sin modelos declarados en config/mlops_config.json</p>
      )}

      <p className={styles.cardResumen}>{resumen.join(' · ')}</p>
      <ul className={styles.modelos} aria-label="Modelos">
        {(p.modelos || []).map((m) => <ModeloChip key={m.nombre} m={m} />)}
      </ul>

      <div className={styles.cardPie}>
        <span className={styles.verDetalle}>Ver detalle →</span>
        <a className={styles.repo} href={p.repo_url} target="_blank" rel="noopener">Repositorio ↗</a>
      </div>
    </article>
  );
}

export default function Home() {
  const [f, set, limpiar] = useFiltros();
  const {siteConfig} = useDocusaurusContext();

  const porSalud = useMemo(() => modelosPorSalud(catalog), []);
  const noSaludables = porSalud.filter((m) => m.salud.nivel !== 'saludable');
  const pctSaludables = porSalud.length
    ? Math.round((100 * (porSalud.length - noSaludables.length)) / porSalud.length)
    : 0;
  const conDrift = porSalud.filter((m) => m.drift).length;
  const areas = useMemo(() => [...new Set(catalog.map((p) => p.area).filter(Boolean))].sort(), []);

  // conteos de chips sobre lo que dejan los OTROS filtros (así el número anticipa el resultado)
  const base = catalog.filter((p) => coincide(p, f.q) && (!f.area || p.area === f.area));
  const conteos = {
    estado: Object.fromEntries(ORDEN_ESTADOS.map((e) => [e, base.filter((p) => p.estado === e && (!f.salud || (p.salud && p.salud.nivel === f.salud))).length])),
    salud: Object.fromEntries(NIVELES_ORDEN.map((n) => [n, base.filter((p) => p.salud && p.salud.nivel === n && (!f.estado || p.estado === f.estado)).length])),
  };
  const filtrados = base
    .filter((p) => !f.estado || p.estado === f.estado)
    .filter((p) => !f.salud || (p.salud && p.salud.nivel === f.salud))
    .sort((a, b) =>
      f.orden === 'nombre'
        ? a.nombre.localeCompare(b.nombre)
        : (a.salud ? a.salud.score : 101) - (b.salud ? b.salud.score : 101) || a.nombre.localeCompare(b.nombre),
    );
  const hayFiltros = FILTROS.some((k) => k !== 'orden' && f[k]);

  return (
    <Layout title="Dashboard" description="Knowledge Center — salud y documentación de los modelos del COE">
      <main className={styles.main}>
       <div className={styles.mainInner}>
        <header className={styles.head}>
          <div>
            <h1 className={styles.titulo}>Modelos del COE</h1>
            <p className={styles.sub}>
              {catalog.length} proyectos · {porSalud.length} modelos · datos al {fmtFecha(siteConfig.customFields.fechaBuild)}
            </p>
          </div>
          <div className={styles.kpis}>
            <Kpi valor={`${pctSaludables}%`} label="modelos saludables" destacado />
            <Kpi valor={noSaludables.length} label="requieren atención" />
            <Kpi valor={conDrift} label="con Model Card desactualizado" />
            <Kpi valor={catalog.filter((p) => p.estado === 'produccion').length} label="proyectos en producción" />
          </div>
        </header>

        <Atencion modelos={noSaludables} />

        <section aria-labelledby="proyectos-titulo">
          <div className={styles.seccionHead}>
            <h2 id="proyectos-titulo" className={styles.seccionTitulo}>
              Proyectos <span className={styles.contador}>{filtrados.length}</span>
            </h2>
            <span className={styles.seccionHint}>La salud de un proyecto es la de su peor modelo</span>
            {hayFiltros && <button className={styles.verMas} onClick={limpiar}>Limpiar filtros</button>}
            <Selects f={f} set={set} areas={areas} />
          </div>
          <Toolbar f={f} set={set} conteos={conteos} />

          {catalog.length === 0 ? (
            <p className={styles.vacio}>
              Aún no hay proyectos indexados. Corre la agregación (<code>scripts/aggregate.py</code>).
            </p>
          ) : filtrados.length === 0 ? (
            <p className={styles.vacio}>
              Ningún proyecto coincide con los filtros.{' '}
              <button className={styles.verMas} onClick={limpiar}>Limpiar filtros</button>
            </p>
          ) : (
            <div className={styles.grid}>
              {filtrados.map((p) => <Card key={p.slug} p={p} />)}
            </div>
          )}
        </section>
       </div>
      </main>
    </Layout>
  );
}
