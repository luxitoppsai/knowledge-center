import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import CopyText from '@site/src/components/CopyText';
import styles from './styles.module.css';

export default function ModelCardHelp({repoUrl}) {
  const guia = useBaseUrl('/docs/actualizar-model-card');
  return (
    <details className={styles.help}>
      <summary>Ver cómo actualizarlo</summary>
      <p>Abre el repositorio del proyecto y revisa los datos actuales del modelo. Si dispone del
        generador de Model Cards, ejecuta este comando en su asistente de desarrollo:</p>
      <div className={styles.command}>
        <code>/generar-model-card</code>
        <CopyText value="/generar-model-card" label="Copiar comando" />
      </div>
      <p>Revisa las cifras y el propósito del documento antes de guardar los cambios.
        {' '}<a href={guia}>Ver la guía completa</a>
        {repoUrl && <> · <a href={repoUrl} target="_blank" rel="noopener">Abrir repositorio ↗</a></>}
      </p>
    </details>
  );
}
