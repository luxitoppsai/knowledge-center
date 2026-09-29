import React from 'react';
import Content from '@theme-original/DocItem/Content';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import FichaModelo from '@site/src/components/FichaModelo';

// Wrap (no eject) del contenido de cada doc: agrega la ficha del modelo arriba sin tocar el
// markdown que viene de los repos. En docs que no son de un modelo, FichaModelo no renderiza nada.
export default function ContentWrapper(props) {
  const {metadata} = useDoc();
  return (
    <>
      <FichaModelo docId={metadata.id} />
      <Content {...props} />
    </>
  );
}
