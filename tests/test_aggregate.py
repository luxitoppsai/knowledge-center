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
    return {"dias": dias, "fecha_card": "x", "fecha_metadata": "y"}


def test_salud_perfecta():
    s = ag.calcular_salud(100, True, None, 0.8, 2)
    assert s["score"] == 100 and s["nivel"] == "saludable" and s["motivos"] == []
    assert s["componentes"] == s["maximos"] and sum(s["maximos"].values()) == 100


@pytest.mark.parametrize("drift, frescura", [(None, 30), (_drift(30), 15), (_drift(31), 0)])
def test_frescura_segun_drift(drift, frescura):
    s = ag.calcular_salud(100, True, drift, 0.8, 1)
    assert s["componentes"]["frescura"] == frescura
    assert ("desactualizado" in " ".join(s["motivos"])) == (drift is not None)


def test_sin_card_no_suma_frescura():
    s = ag.calcular_salud(67, False, None, 0.8, 1)
    assert s["componentes"]["frescura"] == 0 and "Sin Model Card" in s["motivos"]


def test_sin_metrica_ni_linaje():
    s = ag.calcular_salud(100, True, None, None, 0)
    assert s["componentes"]["desempeno"] == 0 and s["componentes"]["linaje"] == 0
    assert s["score"] == 80 and len(s["motivos"]) == 2


@pytest.mark.parametrize("args, score, nivel", [
    ((100, True, None, None, 0), 80, "saludable"),       # frontera inferior de saludable
    ((100, True, _drift(40), 0.8, 0), 60, "atencion"),
    ((100, True, _drift(40), None, 0), 50, "atencion"),   # frontera inferior de atención
    ((0, False, None, 0.8, 3), 20, "critico"),
    ((33, True, _drift(40), 0.8, 3), 36, "critico"),
])
def test_niveles(args, score, nivel):
    s = ag.calcular_salud(*args)
    assert (s["score"], s["nivel"]) == (score, nivel)


def test_frontera_79_es_atencion():
    s = ag.calcular_salud(98, True, None, None, 0)  # 49 + 30 = 79
    assert (s["score"], s["nivel"]) == (79, "atencion")


def test_frontera_49_es_critico():
    s = ag.calcular_salud(98, True, _drift(40), None, 0)  # 49 + 0 = 49
    assert (s["score"], s["nivel"]) == (49, "critico")


# --- peor_salud --------------------------------------------------------------------------------

def test_proyecto_toma_el_peor_modelo():
    modelos = [{"salud": {"score": 90, "nivel": "saludable"}},
               {"salud": {"score": 30, "nivel": "critico"}}]
    assert ag.peor_salud(modelos) == {"score": 30, "nivel": "critico"}


def test_proyecto_sin_modelos():
    assert ag.peor_salud([]) is None
