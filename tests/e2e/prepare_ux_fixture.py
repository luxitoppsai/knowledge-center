"""Prepara una copia temporal del sitio con datos ficticios para verificar RFC-005 sin GitHub.

Uso: python tests/e2e/prepare_ux_fixture.py /tmp/kc-ux-fixture
No sobreescribe el catálogo ni los documentos del checkout de trabajo.
"""

import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
import aggregate as ag


def preparar(destino: Path) -> None:
    """Copia el código del sitio y genera seis proyectos, incluidos casos de nombres largos."""
    destino = destino.resolve()
    if destino == ROOT or ROOT in destino.parents or destino.exists():
        raise ValueError("Usa un directorio nuevo fuera del checkout del proyecto.")
    destino.mkdir(parents=True)
    for nombre in ("src", "plugins", "static"):
        shutil.copytree(ROOT / nombre, destino / nombre)
    (destino / "docs").mkdir()
    for doc in (ROOT / "docs").glob("*.md"):
        shutil.copy2(doc, destino / "docs" / doc.name)
    for nombre in ("package.json", "package-lock.json", "docusaurus.config.js", "sidebars.js"):
        shutil.copy2(ROOT / nombre, destino / nombre)
    (destino / "node_modules").symlink_to(ROOT / "node_modules", target_is_directory=True)

    card = "2026-07-16T12:00:00Z"
    nueva = "2026-09-09T12:00:00Z"
    compartida = "catalog.core.hm_clientes"
    proposito = "Estima el riesgo para apoyar una decisión de negocio. Datos ficticios de revisión visual."
    catalogo = []
    for i in range(6):
        slug = f"coaa_revision_visual_{i + 1}"
        modelos = []
        for j in range(4 if i == 0 else 1):
            nombre = f"segmento_{j + 1}_LogisticRegression_bestModel"
            if i == 0 and j == 3:
                nombre = "modelo_con_identificador_extenso_" + "segmento_" * 8 + "bestModel"
            presentes = [] if i == 0 and j == 0 else ["model-card", "lineage", "functions"]
            drift = ag.calcular_drift(card, nueva) if i == 1 else None
            tablas = [] if not presentes else [compartida, f"catalog.area_{i + 1}.hm_segmentos"]
            salud = ag.calcular_salud(100 if presentes else 0, [d for d in ag.DOCS_ESPERADOS if d not in presentes],
                                     bool(presentes), drift, 0.82 if presentes else None, len(tablas))
            modelo = {
                "nombre": nombre, "version": "1", "algoritmo": "LogisticRegression", "flavour": "sklearn",
                "auc": 0.82 if presentes else None, "features": 24, "n_tablas": len(tablas),
                "completitud": 100 if presentes else 0, "docs_presentes": presentes,
                "docs_esperados": ag.DOCS_ESPERADOS, "salud": salud, "drift": drift,
                "fechas": {"card": card if presentes else None, "metadata": nueva if drift else card},
                "sources": {"table_list": tablas, "dataset_info": {}},
                "doc_url": f"/docs/{slug}/{nombre}/model-card" if presentes else None,
                "resumen_proposito": proposito if presentes else None,
                "resumen_como_funciona": "Lee las tablas declaradas y calcula un puntaje." if presentes else None,
            }
            modelos.append(modelo)
            if presentes:
                carpeta = destino / "docs" / slug / nombre
                carpeta.mkdir(parents=True)
                md = (f"---\nid: model-card\ntitle: Model Card\nsidebar_label: Model Card\n---\n\n# {nombre}\n\n"
                      "## Identidad\n\n| Campo | Valor |\n| --- | --- |\n| Versión | 1 |\n\n"
                      f"## Propósito y uso previsto\n\n{proposito}\n\n"
                      "## Cómo funciona\n\nLee las tablas declaradas y calcula un puntaje.\n\n"
                      "## Hiperparámetros\n\nConfiguración de ejemplo.\n\n"
                      "## Métricas\n\nAUC declarada: 0.82.\n\n"
                      "## Limitaciones y consideraciones\n\nNo usar estos datos ficticios para decisiones reales.\n")
                (carpeta / "model-card.md").write_text(ag.ordenar_model_card(md))
                for doc in ("lineage", "functions"):
                    (carpeta / f"{doc}.md").write_text(f"---\nid: {doc}\ntitle: {doc}\n---\n\n# {doc}\n\nDocumento de ejemplo.\n")
        eventos = [{"fecha": f"2026-09-{29 - k:02d}T12:00:00Z", "tipo": "doc",
                    "detalle": "docs: Documentación actualizada con una explicación extensa de cambios y limitaciones del modelo",
                    "url": "https://github.com/example/revision"} for k in range(2)]
        catalogo.append({
            "slug": slug, "nombre": f"Proyecto de revisión {i + 1}", "area": "an_riesgos" if i < 3 else "an_negocio",
            "repo_url": "https://github.com/example/revision", "estado": "produccion" if i in (1, 2) else "desarrollo",
            "resumen_proyecto": "Proyecto ficticio para revisar la interfaz con varios modelos y documentos.",
            "n_modelos": len(modelos), "modelos_completos": sum(m["completitud"] == 100 for m in modelos),
            "completitud_promedio": round(sum(m["completitud"] for m in modelos) / len(modelos)),
            "salud": ag.peor_salud(modelos), "modelos": modelos, "historial": eventos,
        })
    (destino / "src/data/catalog.json").write_text(json.dumps(catalogo, ensure_ascii=False, indent=2))
    print(f"Fixture: {destino} · {len(catalogo)} proyectos · {sum(p['n_modelos'] for p in catalogo)} modelos")


if __name__ == "__main__":
    preparar(Path(sys.argv[1]))
