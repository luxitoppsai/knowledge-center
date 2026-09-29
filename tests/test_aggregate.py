"""Tests de las funciones puras del agregador (sin red ni token)."""

import json

import pytest

import aggregate as ag


# --- leer_mlops_config -------------------------------------------------------------------------

@pytest.fixture
def config(monkeypatch):
    def _con(contenido):
        monkeypatch.setattr(ag, "bajar", lambda full, path, ref="develop": contenido)
        return ag.leer_mlops_config("o/r")
    return _con


def test_config_valida(config):
    cfg = {"models": [{"name": "a", "version": "1"}, {"name": "b", "version": "2"}]}
    assert [m["name"] for m in config(json.dumps(cfg))] == ["a", "b"]


@pytest.mark.parametrize("contenido", [None, "{no es json", json.dumps({"environments": []})])
def test_config_ausente_invalida_o_sin_models(config, contenido):
    assert config(contenido) == []


def test_config_omite_modelo_sin_name(config):
    cfg = {"models": [{"version": "1"}, {"name": "ok"}]}
    assert [m["name"] for m in config(json.dumps(cfg))] == ["ok"]


# --- extraer_resumen ---------------------------------------------------------------------------

def test_resumen_extrae_y_omite_placeholder():
    md = (
        "## Propósito y uso previsto\n\nPredice la fuga.\n\n"
        "## Cómo funciona\n\n:::note Por completar\nguía\n:::\n\n## Otra\n\nx"
    )
    assert ag.extraer_resumen(md) == {"proposito": "Predice la fuga.", "como_funciona": None}


def test_resumen_sin_card():
    assert ag.extraer_resumen(None) == {"proposito": None, "como_funciona": None}


# --- calcular_drift ----------------------------------------------------------------------------

def test_drift_metadata_mas_nueva():
    d = ag.calcular_drift("2026-06-12T10:00:00Z", "2026-07-24T09:00:00Z")
    assert d["dias"] == 41


@pytest.mark.parametrize("card, meta", [
    ("2026-07-24T00:00:00Z", "2026-06-12T00:00:00Z"),  # card más nueva
    ("2026-07-24T00:00:00Z", "2026-07-24T00:00:00Z"),  # mismo commit
    (None, "2026-07-24T00:00:00Z"),
    ("2026-07-24T00:00:00Z", None),
])
def test_sin_drift(card, meta):
    assert ag.calcular_drift(card, meta) is None


# --- calcular_salud ----------------------------------------------------------------------------

def _drift(dias):
    return {"dias": dias, "fecha_card": "2026-07-16T12:00:00Z", "fecha_metadata": "2026-09-09T12:00:00Z"}


def _salud(completitud=100, faltantes=(), card=True, drift=None, auc=0.8, tablas=1):
    return ag.calcular_salud(completitud, list(faltantes), card, drift, auc, tablas)


def test_salud_perfecta():
    s = _salud(tablas=2)
    assert s["score"] == 100 and s["nivel"] == "saludable" and s["motivos"] == []
    assert s["componentes"] == s["maximos"] and sum(s["maximos"].values()) == 100


@pytest.mark.parametrize("drift, frescura", [(None, 30), (_drift(30), 15), (_drift(31), 0)])
def test_frescura_segun_drift(drift, frescura):
    s = _salud(drift=drift)
    assert s["componentes"]["frescura"] == frescura
    assert ("Regenera el Model Card" in " ".join(s["motivos"])) == (drift is not None)


def test_motivos_son_acciones_en_orden():
    s = _salud(0, ["model-card", "lineage", "functions"], card=False, auc=None, tablas=0)
    assert s["motivos"] == [
        "Genera el Model Card con /generar-model-card",
        "Faltan lineage.md y functions.md",
        "Declara una métrica de desempeño en model_data.json",
        "Declara las tablas fuente en model_data.json",
    ]


def test_un_solo_faltante_en_singular():
    assert _salud(67, ["functions"])["motivos"] == ["Falta functions.md"]


def test_drift_va_primero_con_dias():
    s = _salud(67, ["lineage"], drift=_drift(55))
    assert s["motivos"][0] == "Regenera el Model Card: 55 días de atraso"


def test_sin_card_no_suma_frescura():
    s = _salud(67, ["model-card"], card=False)
    assert s["componentes"]["frescura"] == 0


def test_sin_metrica_ni_linaje():
    s = _salud(auc=None, tablas=0)
    assert s["componentes"]["desempeno"] == 0 and s["componentes"]["linaje"] == 0
    assert s["score"] == 80 and len(s["motivos"]) == 2


@pytest.mark.parametrize("kw, score, nivel", [
    (dict(auc=None, tablas=0), 80, "saludable"),                   # frontera inferior de saludable
    (dict(drift=_drift(40), tablas=0), 60, "atencion"),
    (dict(drift=_drift(40), auc=None, tablas=0), 50, "atencion"),  # frontera inferior de atención
    (dict(completitud=0, card=False, tablas=3), 20, "critico"),
    (dict(completitud=33, drift=_drift(40), tablas=3), 36, "critico"),
    (dict(completitud=98, auc=None, tablas=0), 79, "atencion"),    # 49 + 30
    (dict(completitud=98, drift=_drift(40), auc=None, tablas=0), 49, "critico"),
])
def test_niveles(kw, score, nivel):
    s = _salud(**kw)
    assert (s["score"], s["nivel"]) == (score, nivel)


# --- intro_readme ------------------------------------------------------------------------------

def test_intro_readme_hasta_el_primer_encabezado():
    md = (
        "# Riesgo Consumo\n\nEstima el riesgo\nde crédito.\n\nSegundo párrafo.\n\n"
        "## Estructura\n\n```\nconfig/ # x\n```\n\nOtra cosa"
    )
    assert ag.intro_readme(md) == "Estima el riesgo de crédito.\n\nSegundo párrafo."


def test_intro_readme_ignora_codigo_y_sin_intro():
    assert ag.intro_readme("# T\n\n```\na\n\nb\n```\n\nTexto.") == "Texto."
    assert ag.intro_readme("# T\n\n## Solo secciones\n\nx") is None


# --- aviso_drift -------------------------------------------------------------------------------

def test_aviso_drift_bajo_el_titulo():
    md = "---\nid: model-card\n---\n\n# pd_model\n\n## Identidad\n"
    out = ag.aviso_drift(md, _drift(55), "/proyecto/p#modelo-pd_model")
    titulo, resto = out.split("# pd_model\n\n", 1)
    assert titulo.startswith("---\nid: model-card")
    assert resto.startswith(":::warning Model Card desactualizado (55 días)")
    assert "reentrenó el 9 set 2026" in resto and "es del 16 jul 2026" in resto
    assert "(/proyecto/p#modelo-pd_model)" in resto and resto.endswith("## Identidad\n")


# --- peor_salud --------------------------------------------------------------------------------

def test_proyecto_toma_el_peor_modelo():
    modelos = [{"salud": {"score": 90, "nivel": "saludable"}},
               {"salud": {"score": 30, "nivel": "critico"}}]
    assert ag.peor_salud(modelos) == {"score": 30, "nivel": "critico"}


def test_proyecto_sin_modelos():
    assert ag.peor_salud([]) is None
