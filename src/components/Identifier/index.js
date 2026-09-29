import React from 'react';
import CopyText from '@site/src/components/CopyText';
import styles from './styles.module.css';

/** Identificador exacto, sin truncamiento ni alias inventados. */
export default function Identifier({value, copy = false}) {
  return (
    <span className={styles.identifier}>
      <span className={styles.value}>{value}</span>
      {copy && <CopyText value={value} ariaLabel={`Copiar identificador ${value}`} />}
    </span>
  );
}
