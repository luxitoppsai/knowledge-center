"""Agregación del Knowledge Center (vista computada).

Descubre los repos de proyecto (prefijo ``kc-``), y de CADA uno **deriva en vivo**:
- copia sus ``docs/*.md`` a ``docs/<slug>/`` (insumo temporal del build, no se versiona),
- calcula el catálogo: metadata (project.yaml), métricas (model_data.json), completitud de docs,
  y estado (por tags/releases) → ``static/catalog.json``.

Nada se almacena permanentemente: en cada build se re-deriva del estado actual de los repos.

Auth: ``GITHUB_TOKEN`` (CI) o ``gh auth token`` (local). Owner/prefijo por entorno.
"""

from __future__ import annotations

import base64
import json
import os
import re
import subprocess
from pathlib import Path

import requests

RAIZ = Path(__file__).resolve().parents[1]
DOCS = RAIZ / "docs"
CATALOG = RAIZ / "src" / "data" / "catalog.json"

API = os.environ.get("GITHUB_API_URL", "https://api.github.com").rstrip("/")
OWNER = os.environ.get("KC_OWNER", "luxitoppsai")
PREFIX = os.environ.get("KC_PREFIX", "kc-")
DOCS_ESPERADOS = ["model-card", "lineage", "functions"]


def _token() -> str:
    if os.environ.get("GITHUB_TOKEN"):
        return os.environ["GITHUB_TOKEN"]
    return subprocess.run(["gh", "auth", "token"], capture_output=True, text=True).stdout.strip()


_H = {"Accept": "application/vnd.github+json", "Authorization": f"Bearer {_token()}"}


def _get(url: str, **kw):
    return requests.get(url, headers=_H, timeout=30, **kw)


def listar_repos() -> list[dict]:
    """Lista los repos del owner (incluye privados vía ``/user/repos`` autenticado).

    Usa ``/user/repos`` (requiere que el token pertenezca al propio ``OWNER``) para ver repos
    privados; cae a ``/users/{owner}/repos`` (solo públicos) si el owner no coincide con el token.
    """
    repos, page = [], 1
    while True:
        r = _get(f"{API}/user/repos", params={"per_page": 100, "page": page, "affiliation": "owner"})
        if r.status_code == 401:
            r = _get(f"{API}/users/{OWNER}/repos", params={"per_page": 100, "page": page})
        r.raise_for_status()
        lote = r.json()
        if not lote:
            break
        repos += [x for x in lote if x["name"].startswith(PREFIX) and x["owner"]["login"] == OWNER]
        if len(lote) < 100:
            break
        page += 1
    return repos


def bajar(full_name: str, path: str, ref: str = "develop") -> str | None:
    r = _get(f"{API}/repos/{full_name}/contents/{path}", params={"ref": ref})
    if r.status_code == 404:
        # fallback a la rama por defecto
        r = _get(f"{API}/repos/{full_name}/contents/{path}")
        if r.status_code == 404:
            return None
    r.raise_for_status()
    d = r.json()
    if isinstance(d, dict) and d.get("encoding") == "base64":
        return base64.b64decode(d["content"]).decode("utf-8", "replace")
    return None


def listar_docs(full_name: str, ref: str = "develop") -> list[str]:
    r = _get(f"{API}/repos/{full_name}/contents/docs", params={"ref": ref})
    if r.status_code != 200:
        r = _get(f"{API}/repos/{full_name}/contents/docs")
    if r.status_code != 200:
        return []
    return [f["name"] for f in r.json() if f["name"].endswith(".md")]


def tiene_release(full_name: str) -> bool:
    return _get(f"{API}/repos/{full_name}/releases/latest").status_code == 200 or bool(
        _get(f"{API}/repos/{full_name}/tags", params={"per_page": 1}).json()
    )


def historial(full_name: str) -> list[dict]:
    """Deriva la línea de tiempo del proyecto de señales que GitHub ya guarda (sin snapshots
    propios): commits que tocaron ``docs/`` (progreso de documentación) + tags/releases (hitos de
    madurez). Se combinan y ordenan por fecha, más reciente primero.

    :param full_name: ``owner/repo``.
    :returns: Lista de eventos ``{fecha, tipo, detalle, url}``.
    """
    eventos: list[dict] = []

    r = _get(f"{API}/repos/{full_name}/commits", params={"path": "docs", "per_page": 15})
    if r.status_code == 200:
        for c in r.json():
            msg = (c.get("commit") or {}).get("message", "").splitlines()[0]
            fecha = (((c.get("commit") or {}).get("committer") or {}).get("date"))
            if fecha:
                eventos.append({
                    "fecha": fecha, "tipo": "doc",
                    "detalle": msg[:90], "url": c.get("html_url"),
                })

    r = _get(f"{API}/repos/{full_name}/tags", params={"per_page": 10})
    if r.status_code == 200:
        for t in r.json():
            sha = (t.get("commit") or {}).get("sha")
            fecha = None
            if sha:
                rc = _get(f"{API}/repos/{full_name}/commits/{sha}")
                if rc.status_code == 200:
                    fecha = (((rc.json().get("commit") or {}).get("committer") or {}).get("date"))
            if fecha:
                eventos.append({
                    "fecha": fecha, "tipo": "release",
                    "detalle": f"Tag {t.get('name')}",
                    "url": f"https://github.com/{full_name}/releases/tag/{t.get('name')}",
                })

    eventos.sort(key=lambda e: e["fecha"], reverse=True)
    return eventos


def _parse_yaml_simple(txt: str) -> dict:
    """Parser mínimo de ``clave: "valor"`` (evita dependencia de PyYAML en CI)."""
    out = {}
    for ln in txt.splitlines():
        ln = ln.split("#", 1)[0].rstrip()
        m = re.match(r'\s*([\w-]+):\s*"?(.*?)"?\s*$', ln)
        if m and m.group(2) != "":
            out[m.group(1)] = m.group(2)
    return out


#: Secciones narrativas del Model Card que sirven de "resumen del proyecto" en el detalle.
_SECCIONES_RESUMEN = {
    "proposito": "Propósito y uso previsto",
    "como_funciona": "Cómo funciona",
}


def extraer_resumen(model_card_md: str | None) -> dict[str, str | None]:
    """Extrae las secciones narrativas del ``model-card.md`` para el resumen del detalle.

    No inventa nada: lee texto que ya escribió la skill de autodoc (humano o agente). Si la sección
    quedó con el marcador ``Por completar`` (aún no se generó la narrativa), devuelve ``None`` para
    que el detalle lo indique en vez de mostrar el placeholder crudo.

    :param model_card_md: Contenido de ``docs/model-card.md``, o ``None`` si el repo no lo tiene.
    :returns: ``{"proposito": texto|None, "como_funciona": texto|None}``.
    """
    resumen: dict[str, str | None] = {k: None for k in _SECCIONES_RESUMEN}
    if not model_card_md:
        return resumen
    for clave, titulo in _SECCIONES_RESUMEN.items():
        m = re.search(rf"## {re.escape(titulo)}\n\n(.+?)(?=\n## |\Z)", model_card_md, re.S)
        if not m:
            continue
        texto = m.group(1).strip()
        if texto and "Por completar" not in texto:
            resumen[clave] = texto
    return resumen


def _auc(meta: dict) -> float | None:
    for m in meta.get("models", []) or []:
        for ev in (((m.get("metrics") or {}).get("test") or {}).get("evaluation_metrics_data") or []):
            for k, v in ev.items():
                if "areaUnderROC" in k:
                    return v
    return None


def procesar(repo: dict) -> dict:
    full = repo["full_name"]
    slug = repo["name"][len(PREFIX):] if repo["name"].startswith(PREFIX) else repo["name"]

    # copiar docs al árbol de Docusaurus
    destino = DOCS / slug
    destino.mkdir(parents=True, exist_ok=True)
    presentes = []
    model_card_md = None
    for nombre in listar_docs(full):
        contenido = bajar(full, f"docs/{nombre}")
        if contenido:
            (destino / nombre).write_text(contenido, encoding="utf-8")
            presentes.append(Path(nombre).stem)
            if nombre == "model-card.md":
                model_card_md = contenido

    # metadata
    py = _parse_yaml_simple(bajar(full, "project.yaml") or "")
    md_raw = bajar(full, "model_data.json")
    meta = json.loads(md_raw) if md_raw else {}
    m0 = (meta.get("models") or [{}])[0]

    completos = [d for d in DOCS_ESPERADOS if d in presentes]
    completitud = round(100 * len(completos) / len(DOCS_ESPERADOS))
    con_release = tiene_release(full)
    estado = "produccion" if con_release else ("desarrollo" if presentes else "nuevo")
    eventos = historial(full)
    resumen = extraer_resumen(model_card_md)

    # categoría para el sidebar de Docusaurus
    (destino / "_category_.json").write_text(
        json.dumps({"label": py.get("name", slug), "position": 1}, ensure_ascii=False),
        encoding="utf-8",
    )

    return {
        "slug": slug,
        "nombre": py.get("name", slug),
        "area": py.get("area") or meta.get("area"),
        "tipo_modelo": py.get("tipo_modelo"),
        "repo_url": repo["html_url"],
        "doc_url": f"/docs/{slug}/model-card" if "model-card" in presentes else None,
        "algoritmo": m0.get("algorithm_name"),
        "flavour": m0.get("flavour"),
        "features": ((m0.get("features") or {}).get("feature_count")),
        "auc": _auc(meta),
        "n_tablas": len((meta.get("sources") or {}).get("table_list") or []),
        "docs_presentes": presentes,
        "completitud": completitud,
        "estado": estado,
        "resumen_proposito": resumen["proposito"],
        "resumen_como_funciona": resumen["como_funciona"],
        "actualizado": repo.get("pushed_at"),
        "creado": repo.get("created_at"),
        "historial": eventos,
        "docs_esperados": DOCS_ESPERADOS,
        "sources": {
            "dataset_info": (meta.get("sources") or {}).get("dataset_info") or {},
            "table_list": (meta.get("sources") or {}).get("table_list") or [],
        },
    }


def main() -> None:
    repos = listar_repos()
    print(f"Descubiertos {len(repos)} repos '{PREFIX}*'")
    catalogo = [procesar(r) for r in repos]
    catalogo.sort(key=lambda c: (-(c["completitud"] or 0), c["nombre"]))
    CATALOG.parent.mkdir(parents=True, exist_ok=True)
    CATALOG.write_text(json.dumps(catalogo, ensure_ascii=False, indent=2), encoding="utf-8")
    for c in catalogo:
        print(f"  · {c['nombre']}: {c['completitud']}% · {c['estado']} · AUC {c['auc']}")
    print(f"Catálogo: {CATALOG} ({len(catalogo)} proyectos)")


if __name__ == "__main__":
    main()
