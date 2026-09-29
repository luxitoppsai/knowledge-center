/** Motivos derivados del agregador, presentados sin comandos en la lectura inicial. */
export function describirMotivo(motivo) {
  return motivo
    .replace('Genera el Model Card con /generar-model-card', 'Model Card pendiente')
    .replace('Regenera el Model Card:', 'Revisa el Model Card:')
    .replace('model-card.md', 'Model Card')
    .replace('lineage.md', 'documento de linaje')
    .replace('functions.md', 'documento de funciones')
    .replace('en model_data.json', 'en los metadatos del modelo');
}
