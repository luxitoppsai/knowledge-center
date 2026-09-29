"""Agregación del Knowledge Center (vista computada).

Descubre los repos de proyecto (prefijos ``coaa_``/``coeaa_``). Cada repo es un **proyecto** que
puede contener **varios modelos** (listados en ``config/mlops_config.json``). De CADA proyecto
**deriva en vivo**:
- copia la doc de cada modelo (``docs/<modelo>/*.md``) a ``docs/<slug>/<modelo>/`` (insumo
  temporal del build, no se versiona),
- calcula el catálogo: metadata por modelo (``docs/<modelo>/model_data.json``), completitud de
  docs por modelo, resumen del proyecto (``README.md``/``README_info.md`` raíz), y estado del
  proyecto (por tags/releases) → ``static/catalog.json``.

Nada se almacena permanentemente: en cada build se re-deriva del estado actual de los repos.

Auth: ``GITHUB_TOKEN`` (CI) o ``gh auth token`` (local). Owner/prefijos por entorno.
"""

from __future__ import annotations

import base64
import json
import os
import re
import subprocess
from datetime import datetime
from functools import cache
from pathlib import Path

import requests

RAIZ = Path(__file__).resolve().parents[1]
DOCS = RAIZ / "docs"
CATALOG = RAIZ / "src" / "data" / "catalog.json"

API = os.environ.get("GITHUB_API_URL", "https://api.github.com").rstrip("/")
OWNER = os.environ.get("KC_OWNER", "luxitoppsai")
PREFIXES = tuple(
    p.strip() for p in os.environ.get("KC_PREFIXES", "coaa_,coeaa_").split(",") if p.strip()
)
DOCS_ESPERADOS = ["model-card", "lineage", "functions"]

#: Salud del modelo (RFC-002 R2.3). Único lugar donde viven pesos y umbrales; la UI los muestra.
PESOS_SALUD = {"documentacion": 50, "frescura": 30, "desempeno": 10, "linaje": 10}
DRIFT_TOLERANCIA_DIAS = 30
UMBRAL_SALUDABLE = 80
UMBRAL_ATENCION = 50


@cache
def _headers() -> dict[str, str]:
    """Headers de la API, resueltos en la primera llamada (importar el módulo no pide token)."""
    token = os.environ.get("GITHUB_TOKEN") or subprocess.run(
        ["gh", "auth", "token"], capture_output=True, text=True
    ).stdout.strip()
    return {"Accept": "application/vnd.github+json", "Authorization": f"Bearer {token}"}


def _get(url: str, **kw):
    return requests.get(url, headers=_headers(), timeout=30, **kw)


def listar_repos() -> list[dict]:
    """Lista los repos del owner (incluye privados vía ``/user/repos`` autenticado).

    Usa ``/user/repos`` (requiere que el token pertenezca al propio ``OWNER``) para ver repos
    privados; cae a ``/users/{owner}/repos`` (solo públicos) si el owner no coincide con el token.
    Descubre por CUALQUIERA de los prefijos en ``PREFIXES`` (``coaa_``, ``coeaa_``).
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
        repos += [
            x for x in lote
            if x["name"].startswith(PREFIXES) and x["owner"]["login"] == OWNER
        ]
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


def listar_docs(full_name: str, path: str = "docs", ref: str = "develop") -> list[str]:
    r = _get(f"{API}/repos/{full_name}/contents/{path}", params={"ref": ref})
    if r.status_code != 200:
        r = _get(f"{API}/repos/{full_name}/contents/{path}")
    if r.status_code != 200:
        return []
    return [f["name"] for f in r.json() if f["name"].endswith(".md")]


def leer_mlops_config(full_name: str) -> list[dict]:
    """Lee ``config/mlops_config.json`` para obtener los modelos del proyecto.

    Valida el contrato mínimo (ver ``setup/README.md``) en vez de fallar en silencio: un modelo
    sin ``name`` no se puede mapear a su carpeta ``docs/<name>/`` y se descarta con un aviso, en
    vez de producir una entrada rota que confunda por qué "no aparecen modelos".

    :param full_name: ``owner/repo``.
    :returns: Lista de ``{"name": ..., "version": ...}`` válidos; vacía si el repo no tiene el
        archivo, tiene JSON inválido, o no trae la clave ``models``.
    """
    contenido = bajar(full_name, "config/mlops_config.json")
    if not contenido:
        return []
    try:
        data = json.loads(contenido)
    except json.JSONDecodeError as e:
        print(f"  ⚠ {full_name}: config/mlops_config.json inválido ({e}) — se ignora")
        return []

    if "models" not in data:
        print(f"  ⚠ {full_name}: config/mlops_config.json no tiene la clave 'models' — se ignora")
        return []

    modelos = []
    for i, m in enumerate(data.get("models") or []):
        nombre = m.get("name")
        if not nombre:
            print(f"  ⚠ {full_name}: models[{i}] sin 'name' válido — se omite")
            continue
        if not m.get("version"):
            print(f"  ⚠ {full_name}: modelo '{nombre}' sin 'version' — se documenta igual")
        modelos.append(m)
    return modelos


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


def fecha_ultimo_commit(full_name: str, path: str) -> str | None:
    """Fecha ISO del último commit que tocó ``path`` (rama ``develop``, si no la por defecto).

    :param full_name: ``owner/repo``.
    :param path: Ruta del archivo dentro del repo.
    :returns: Fecha del committer, o ``None`` si ningún commit tocó el archivo.
    """
    for params in ({"path": path, "sha": "develop", "per_page": 1}, {"path": path, "per_page": 1}):
        r = _get(f"{API}/repos/{full_name}/commits", params=params)
        if r.status_code == 200 and r.json():
            return r.json()[0]["commit"]["committer"]["date"]
    return None


def _dt(iso: str) -> datetime:
    return datetime.fromisoformat(iso.replace("Z", "+00:00"))


def calcular_drift(fecha_card: str | None, fecha_metadata: str | None) -> dict | None:
    """Doc drift: la metadata del entrenamiento es más nueva que el Model Card (R2.2).

    :param fecha_card: Último commit a ``model-card.md``.
    :param fecha_metadata: Último commit a ``model_data.json``.
    :returns: ``{"dias", "fecha_card", "fecha_metadata"}``, o ``None`` si no hay drift o falta
        alguna de las dos fechas (sin card no hay "desactualización": hay ausencia, y eso ya lo
        penaliza la completitud).
    """
    if not fecha_card or not fecha_metadata or _dt(fecha_metadata) <= _dt(fecha_card):
        return None
    dias = (_dt(fecha_metadata) - _dt(fecha_card)).days
    return {"dias": dias, "fecha_card": fecha_card, "fecha_metadata": fecha_metadata}


def _faltan(docs: list[str]) -> str:
    archivos = [f"{d}.md" for d in docs]
    lista = archivos[0] if len(archivos) == 1 else ", ".join(archivos[:-1]) + f" y {archivos[-1]}"
    return f"{'Falta' if len(archivos) == 1 else 'Faltan'} {lista}"


def calcular_salud(completitud: int, faltantes: list[str], tiene_card: bool, drift: dict | None,
                   auc: float | None, n_tablas: int) -> dict:
    """Puntaje de salud 0–100 con motivos redactados como acción (RFC-002 R2.3, RFC-003 R2).

    Los motivos van en orden de prioridad operativa (primero el Model Card, que es lo que lee
    negocio): la UI muestra el primero como "lo siguiente que hay que hacer".

    :param completitud: % de docs esperados presentes.
    :param faltantes: Docs esperados ausentes (``"lineage"``, ...).
    :param tiene_card: Si existe ``model-card.md``.
    :param drift: Salida de :func:`calcular_drift`.
    :param auc: Métrica declarada en ``model_data.json``.
    :param n_tablas: Tablas en ``sources.table_list``.
    :returns: ``{"score", "nivel", "componentes", "maximos", "motivos"}`` (``maximos`` viaja al
        catálogo para que la UI muestre "x/máx" sin duplicar los pesos).
    """
    motivos = []
    frescura = PESOS_SALUD["frescura"]
    if not tiene_card:
        frescura = 0
        motivos.append("Genera el Model Card con /generar-model-card")
    elif drift:
        frescura = frescura // 2 if drift["dias"] <= DRIFT_TOLERANCIA_DIAS else 0
        motivos.append(f"Regenera el Model Card: {drift['dias']} días de atraso")

    documentacion = round(PESOS_SALUD["documentacion"] * completitud / 100)
    otros_faltantes = [d for d in faltantes if d != "model-card"]
    if otros_faltantes:
        motivos.append(_faltan(otros_faltantes))

    desempeno = PESOS_SALUD["desempeno"] if auc is not None else 0
    if auc is None:
        motivos.append("Declara una métrica de desempeño en model_data.json")

    linaje = PESOS_SALUD["linaje"] if n_tablas else 0
    if not n_tablas:
        motivos.append("Declara las tablas fuente en model_data.json")

    componentes = {"documentacion": documentacion, "frescura": frescura,
                   "desempeno": desempeno, "linaje": linaje}
    score = sum(componentes.values())
    nivel = ("saludable" if score >= UMBRAL_SALUDABLE
             else "atencion" if score >= UMBRAL_ATENCION else "critico")
    return {"score": score, "nivel": nivel, "componentes": componentes,
            "maximos": dict(PESOS_SALUD), "motivos": motivos}


def peor_salud(modelos: list[dict]) -> dict | None:
    """Salud del proyecto = la del peor modelo (R2.4), para no esconder problemas en un promedio."""
    if not modelos:
        return None
    peor = min(modelos, key=lambda m: m["salud"]["score"])["salud"]
    return {"score": peor["score"], "nivel": peor["nivel"]}


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


def intro_readme(md: str) -> str | None:
    """Introducción de un README: los párrafos antes del primer encabezado (RFC-003 R3).

    El README completo es para quien trabaja en el repo (estructura, flujo, comandos); el hub solo
    muestra "qué es el proyecto", que por convención va arriba. Se descartan el ``# título`` y los
    bloques de código.

    :param md: Contenido del README.
    :returns: Párrafos de la introducción separados por línea en blanco, o ``None`` si no hay.
    """
    bloques, actual, en_codigo, titulo_visto = [], [], False, False
    for linea in md.strip().splitlines():
        if linea.lstrip().startswith("```"):
            en_codigo = not en_codigo
            actual = []
            continue
        if en_codigo:
            continue
        if linea.startswith("#"):
            if linea.startswith("# ") and not (bloques or actual or titulo_visto):
                titulo_visto = True
                continue
            break
        if linea.strip():
            actual.append(linea.strip())
        elif actual:
            bloques.append(" ".join(actual))
            actual = []
    if actual:
        bloques.append(" ".join(actual))
    return "\n\n".join(bloques) or None


def resumen_proyecto(full_name: str) -> str | None:
    """Introducción del ``README_info.md``/``README.md`` raíz (en ese orden) como descripción del
    proyecto (no de un modelo).

    :param full_name: ``owner/repo``.
    :returns: Ver :func:`intro_readme`; ``None`` si no hay README o no tiene introducción.
    """
    for nombre in ("README_info.md", "README.md"):
        contenido = bajar(full_name, nombre)
        if contenido:
            return intro_readme(contenido)
    return None


def _auc(meta: dict) -> float | None:
    for m in meta.get("models", []) or []:
        for ev in (((m.get("metrics") or {}).get("test") or {}).get("evaluation_metrics_data") or []):
            for k, v in ev.items():
                if "areaUnderROC" in k:
                    return v
    return None


def ordenar_model_card(md: str) -> str:
    """Presenta propósito, funcionamiento, métricas y limitaciones antes de identidad técnica.

    Conserva el contenido de cada sección y los encabezados para que Docusaurus genere un TOC
    coherente. Solo reconoce encabezados de nivel 2 fuera de bloques de código; no modifica
    el repositorio de origen ni usa la transformación como señal de actualización (RFC-005).

    :param md: Markdown descargado del Model Card.
    :returns: Markdown con secciones reordenadas, sin cambiar su contenido.
    """
    introduccion: list[str] = []
    secciones: list[tuple[str, list[str]]] = []
    actual = introduccion
    cerca: tuple[str, int] | None = None
    for linea in md.splitlines(keepends=True):
        delimitador = re.match(r"^ {0,3}(`{3,}|~{3,})", linea)
        if delimitador:
            marca = delimitador.group(1)
            if cerca is None:
                cerca = (marca[0], len(marca))
            elif marca[0] == cerca[0] and len(marca) >= cerca[1] and not linea[delimitador.end():].strip():
                cerca = None
            actual.append(linea)
            continue
        encabezado = re.match(r"^##\s+(.+?)\s*#*\s*$", linea) if cerca is None else None
        if encabezado:
            actual = []
            secciones.append((encabezado.group(1), actual))
        actual.append(linea)

    prioridad = {"Propósito y uso previsto": 0, "Cómo funciona": 1, "Métricas": 2,
                 "Limitaciones y consideraciones": 3, "Identidad": 5}
    secciones.sort(key=lambda s: prioridad.get(s[0], 4))
    bloques = ["".join(contenido) for _, contenido in secciones]
    # Una sección al final del archivo puede no tener salto final; al moverla necesita separación.
    return "".join(introduccion) + "".join(
        bloque + ("\n\n" if i < len(bloques) - 1 and not bloque.endswith("\n") else "")
        for i, bloque in enumerate(bloques)
    )


def procesar_modelo(full: str, slug: str, modelo_cfg: dict) -> dict:
    """Deriva el catálogo de UN modelo dentro de un proyecto.

    Copia su documentación a ``docs/<slug>/<modelo>/`` y lee sus métricas propias
    (``docs/<modelo>/model_data.json``) — cada modelo es independiente del resto.

    :param full: ``owner/repo`` del proyecto dueño del modelo.
    :param slug: Slug del proyecto (nombre completo del repo, sin recortar prefijo).
    :param modelo_cfg: Entrada de ``config/mlops_config.json`` (``{"name", "version"}``).
    :returns: Catálogo del modelo.
    """
    nombre_modelo = modelo_cfg.get("name", "")
    ruta_docs = f"docs/{nombre_modelo}"
    destino = DOCS / slug / nombre_modelo
    destino.mkdir(parents=True, exist_ok=True)

    presentes = []
    model_card_md = None
    for nombre in listar_docs(full, path=ruta_docs):
        if nombre == "model_data.json":
            continue
        contenido = bajar(full, f"{ruta_docs}/{nombre}")
        if contenido:
            documento = ordenar_model_card(contenido) if nombre == "model-card.md" else contenido
            (destino / nombre).write_text(documento, encoding="utf-8")
            presentes.append(Path(nombre).stem)
            if nombre == "model-card.md":
                model_card_md = contenido

    md_raw = bajar(full, f"{ruta_docs}/model_data.json")
    meta = json.loads(md_raw) if md_raw else {}
    m0 = (meta.get("models") or [{}])[0]

    completos = [d for d in DOCS_ESPERADOS if d in presentes]
    completitud = round(100 * len(completos) / len(DOCS_ESPERADOS))
    resumen = extraer_resumen(model_card_md)

    fechas = {
        "card": fecha_ultimo_commit(full, f"{ruta_docs}/model-card.md") if model_card_md else None,
        "metadata": fecha_ultimo_commit(full, f"{ruta_docs}/model_data.json") if md_raw else None,
    }
    drift = calcular_drift(fechas["card"], fechas["metadata"])
    auc = _auc(meta)
    tablas = (meta.get("sources") or {}).get("table_list") or []
    faltantes = [d for d in DOCS_ESPERADOS if d not in presentes]

    (destino / "_category_.json").write_text(
        json.dumps({"label": nombre_modelo, "position": 1}, ensure_ascii=False),
        encoding="utf-8",
    )

    return {
        "nombre": nombre_modelo,
        "version": modelo_cfg.get("version"),
        "doc_url": f"/docs/{slug}/{nombre_modelo}/model-card" if "model-card" in presentes else None,
        "algoritmo": m0.get("algorithm_name"),
        "flavour": m0.get("flavour"),
        "features": ((m0.get("features") or {}).get("feature_count")),
        "auc": auc,
        "n_tablas": len(tablas),
        "docs_presentes": presentes,
        "completitud": completitud,
        "fechas": fechas,
        "drift": drift,
        "salud": calcular_salud(completitud, faltantes, model_card_md is not None, drift, auc,
                                len(tablas)),
        "resumen_proposito": resumen["proposito"],
        "resumen_como_funciona": resumen["como_funciona"],
        "docs_esperados": DOCS_ESPERADOS,
        "sources": {
            "dataset_info": (meta.get("sources") or {}).get("dataset_info") or {},
            "table_list": tablas,
        },
    }


def procesar(repo: dict) -> dict:
    """Deriva el catálogo de UN proyecto (repo), agregando todos sus modelos.

    :param repo: Objeto de repo devuelto por la API de GitHub.
    :returns: Catálogo del proyecto con la lista de modelos anidada.
    """
    full = repo["full_name"]
    slug = repo["name"]  # nombre completo, sin recortar el prefijo (coaa_/coeaa_)

    py = _parse_yaml_simple(bajar(full, "project.yaml") or "")
    modelos_cfg = leer_mlops_config(full)
    modelos = [procesar_modelo(full, slug, m) for m in modelos_cfg]

    # categoría raíz del proyecto para el sidebar de Docusaurus
    destino = DOCS / slug
    destino.mkdir(parents=True, exist_ok=True)
    (destino / "_category_.json").write_text(
        json.dumps({"label": py.get("name", slug), "position": 1}, ensure_ascii=False),
        encoding="utf-8",
    )

    con_release = tiene_release(full)
    tiene_docs = any(m["docs_presentes"] for m in modelos)
    estado = "produccion" if con_release else ("desarrollo" if tiene_docs else "nuevo")
    eventos = historial(full)
    completitudes = [m["completitud"] for m in modelos]
    completitud_promedio = round(sum(completitudes) / len(completitudes)) if completitudes else 0

    return {
        "slug": slug,
        "nombre": py.get("name", slug),
        "area": py.get("area"),
        "repo_url": repo["html_url"],
        "resumen_proyecto": resumen_proyecto(full),
        "n_modelos": len(modelos),
        "modelos_completos": sum(1 for m in modelos if m["completitud"] == 100),
        "completitud_promedio": completitud_promedio,
        "salud": peor_salud(modelos),
        "estado": estado,
        "actualizado": repo.get("pushed_at"),
        "creado": repo.get("created_at"),
        "historial": eventos,
        "modelos": modelos,
    }


def main() -> None:
    repos = listar_repos()
    print(f"Descubiertos {len(repos)} repos {PREFIXES}")
    catalogo = [procesar(r) for r in repos]
    catalogo.sort(key=lambda c: (-(c["completitud_promedio"] or 0), c["nombre"]))
    CATALOG.parent.mkdir(parents=True, exist_ok=True)
    CATALOG.write_text(json.dumps(catalogo, ensure_ascii=False, indent=2), encoding="utf-8")
    for c in catalogo:
        salud = c["salud"] or {}
        print(f"  · {c['nombre']}: {c['n_modelos']} modelos · {c['completitud_promedio']}% · "
              f"{c['estado']} · salud {salud.get('score', '—')} ({salud.get('nivel', '—')})")
    print(f"Catálogo: {CATALOG} ({len(catalogo)} proyectos)")


if __name__ == "__main__":
    main()
