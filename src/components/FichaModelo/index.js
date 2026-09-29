import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import catalog from '@site/src/data/catalog.json';
import Icon from '@site/src/components/Icon';
import EstadoTag from '@site/src/components/EstadoTag';
import {SaludBadge} from '@site/src/components/Salud';
import styles from './styles.module.css';

const TIPOS = {'model-card': 'Model Card', lineage: 'Linaje', functions: 'Funciones'};

function fmtFecha(iso) {
  return new Date(iso).toLocaleDateString('es-PE', {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'});
}

/** ``<slug>/<modelo>/<doc>`` → {proyecto, modelo, doc}; null si el documento no es de un modelo. */
export function buscarModelo(docId) {
  const partes = (docId || '').split('/');
  if (partes.length !== 3) return null;
  const [slug, nombre, doc] = partes;
  const proyecto = catalog.find((p) => p.slug === slug);
  const modelo = proyecto && (proyecto.modelos || []).find((m) => m.nombre === nombre);
  return modelo ? {proyecto, modelo, doc} : null;
}

/** Ficha de contexto arriba de cada documento de un modelo (RFC-004 R1, R2). */
export default function FichaModelo({docId}) {
  const encontrado = buscarModelo(docId);
  const base = useBaseUrl('/proyecto/');
  if (!encontrado) return null;
  const {proyecto: p, modelo: m, doc} = encontrado;
  const detalle = `${base}${p.slug}#modelo-${m.nombre}`;
  const datos = [
    m.algoritmo && ['Algoritmo', m.algoritmo],
    typeof m.auc === 'number' && ['AUC', m.auc.toFixed(3)],
    m.fechas && m.fechas.card && ['Model Card del', fmtFecha(m.fechas.card)],
    m.version && ['Versión', `v${m.version}`],
  ].filter(Boolean);

  return (
    <aside className={styles.ficha} aria-label="Ficha del modelo">
      <div className={styles.fila}>
        <a href={`${base}${p.slug}`} className={styles.proyecto}>← {p.nombre}</a>
        <EstadoTag estado={p.estado} />
        <span className={styles.tipo}>{TIPOS[doc] || doc}</span>
      </div>
      <div className={styles.datos}>
        {m.salud && (
          <div>
            <span className={styles.label}>Salud</span>
            <a href={detalle} className={styles.salud}><SaludBadge salud={m.salud} /></a>
          </div>
        )}
        {datos.map(([k, v]) => (
          <div key={k}>
            <span className={styles.label}>{k}</span>
            <span className={styles.valor}>{v}</span>
          </div>
        ))}
      </div>
      {doc === 'model-card' && m.drift && (
        <p className={styles.drift} role="status">
          <Icon name="clock" className={styles.icono} />
          <span>
            <strong>Este Model Card está desactualizado ({m.drift.dias} días).</strong> El modelo se
            reentrenó el {fmtFecha(m.drift.fecha_metadata)} y este documento es del{' '}
            {fmtFecha(m.drift.fecha_card)}: sus cifras pueden no describir el modelo actual.{' '}
            <a href={detalle}>Ver la salud del modelo</a>.
          </span>
        </p>
      )}
    </aside>
  );
}
