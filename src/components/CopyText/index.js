import React, {useState} from 'react';
import styles from './styles.module.css';

/** Copia solicitada por el usuario, con feedback visible también si el navegador la rechaza. */
export default function CopyText({value, label = 'Copiar', ariaLabel}) {
  const [mensaje, setMensaje] = useState('');
  const copiar = async () => {
    if (!navigator.clipboard) {
      setMensaje('Selecciona el texto para copiarlo.');
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setMensaje('Copiado');
    } catch {
      setMensaje('No se pudo copiar. Selecciona el texto para copiarlo.');
    }
  };
  return (
    <span className={styles.control}>
      <button type="button" className={styles.button} onClick={copiar} aria-label={ariaLabel || label}>
        {label}
      </button>
      <span role="status" className={styles.status}>{mensaje}</span>
    </span>
  );
}
