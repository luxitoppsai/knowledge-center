import React from 'react';
import Icon from '@site/src/components/Icon';
import {estadoDe} from '@site/src/lib/estado';
import styles from './styles.module.css';

/** Etiqueta neutra de ciclo de vida (producción / desarrollo / nuevo). */
export default function EstadoTag({estado}) {
  const e = estadoDe(estado);
  return (
    <span className={styles.tag}>
      <Icon name={e.icon} className={styles.icon} />
      {e.label}
    </span>
  );
}
