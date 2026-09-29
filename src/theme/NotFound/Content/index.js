import React from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

// Reemplaza la 404 de fábrica (en "usted" y sin salida) por una con el tono del sitio y rutas
// de vuelta. Causa típica: un proyecto o modelo que se renombró o dejó de existir en los repos.
export default function NotFoundContent() {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>Error 404</p>
        <h1 className={styles.titulo}>No encontramos esta página</h1>
        <p className={styles.texto}>
          Puede que el proyecto o el modelo se haya renombrado o ya no exista en los repos: el sitio
          se recalcula en cada build a partir de lo que hay ahí.
        </p>
        <div className={styles.links}>
          <Link className={styles.principal} to="/">Ir al dashboard</Link>
          <Link to="/portafolio">Portafolio</Link>
          <Link to="/linaje">Linaje</Link>
          <Link to="/docs/intro">Documentación</Link>
        </div>
      </div>
    </main>
  );
}
