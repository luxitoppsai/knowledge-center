"""Verificación de los criterios de RFC-003 con clics reales. Uso: python verify_rfc003.py <base_url> <out>"""

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE, OUT = sys.argv[1].rstrip("/"), Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
errores = []

# colores de estado de salud por tema (tokens --kc-green/amber/red)
COLORES_SALUD = """() => {
  const s = getComputedStyle(document.documentElement);
  const tmp = document.createElement('span'); document.body.appendChild(tmp);
  const rgb = (v) => { tmp.style.color = s.getPropertyValue(v).trim(); return getComputedStyle(tmp).color; };
  const out = ['--kc-green', '--kc-amber', '--kc-red'].map(rgb); tmp.remove(); return out;
}"""

FUERA_DE_SALUD = """(colores) => {
  const malos = [];
  for (const el of document.querySelectorAll('article *, article')) {
    const cs = getComputedStyle(el);
    const usa = [cs.color, cs.backgroundColor, cs.borderLeftColor].some((c) => colores.includes(c));
    if (!usa) continue;
    // válido solo dentro de un indicador de salud
    const ok = el.closest('[class*=cardSalud], [class*=punto], [class*=modeloChip], [title^="Salud"]');
    if (!ok) malos.push(el.className || el.tagName);
  }
  return malos;
}"""


def tema(page, t):
    page.goto(f"{BASE}/")
    page.evaluate(f"localStorage.setItem('theme', '{t}')")
    page.reload()
    assert page.evaluate("document.documentElement.dataset.theme") == t


with sync_playwright() as pw:
    b = pw.chromium.launch()
    for t in ("light", "dark"):
        ctx = b.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()
        page.on("console", lambda m: m.type == "error" and errores.append(f"[{t}] {m.text[:200]}"))
        page.on("pageerror", lambda e: errores.append(f"[{t}] {e}"))
        tema(page, t)

        # 1. semántica: verde/ámbar/rojo solo en indicadores de salud dentro de las cards
        colores = page.evaluate(COLORES_SALUD)
        malos = page.evaluate(FUERA_DE_SALUD, colores)
        assert not malos, malos
        # 2. "Requiere atención" en el primer pliegue
        caja = page.locator("#atencion-titulo").bounding_box()
        assert caja["y"] + caja["height"] < 900, caja
        print(f"[{t}] colores solo en salud OK · atención en el pliegue (y={caja['y']:.0f})")

        # 3. buscador por modelo + chip, y ambos sobreviven a una recarga
        page.get_by_label("Buscar proyecto o modelo").fill("lgd")
        assert page.locator("article h3").all_inner_texts() == ["Riesgo Consumo"]
        page.get_by_label("Buscar proyecto o modelo").fill("")
        page.get_by_role("button", name="Atención").click()
        page.get_by_role("button", name="Producción").click()
        page.reload()
        assert page.locator("article h3").all_inner_texts() == ["Riesgo Consumo"], page.locator("article h3").all_inner_texts()
        assert page.get_by_role("button", name="Atención").get_attribute("aria-pressed") == "true"
        page.get_by_role("button", name="Limpiar filtros").first.click()
        assert page.locator("article").count() == 5
        print(f"[{t}] buscador, chips y URL OK")

        # orden por defecto: peor salud primero
        scores = page.locator("[class*=saludScore]").all_inner_texts()
        assert [int(s) for s in scores] == sorted(int(s) for s in scores), scores

        # 4. fila de atención clicable → abre el bloque del modelo en el detalle
        page.get_by_role("link", name="Regenera el Model Card: 55 días de atraso").click()
        page.wait_for_url("**/proyecto/coeaa_riesgo_consumo#modelo-lgd_GLM_bestModel")
        bloque = page.locator("#modelo-lgd_GLM_bestModel")
        assert bloque.get_attribute("open") is not None
        texto = page.locator("body").inner_text()
        for prohibido in ("##", "```", "Repo de proyecto conectado"):
            assert prohibido not in texto.split("Modelos (")[0], prohibido
        print(f"[{t}] atención → detalle con el bloque abierto; resumen limpio")
        page.screenshot(path=OUT / f"detalle-{t}.png", full_page=True)

        # 5. detalle con 3 modelos: solo el peor abierto; el mini-ranking abre otro
        page.goto(f"{BASE}/proyecto/coaa_pyneg_demo_activos")
        abiertos = page.locator("details[id^=modelo-][open]").evaluate_all("els => els.map(e => e.id)")
        assert abiertos == ["modelo-ct_LogisticRegression_bestModel"], abiertos
        page.locator("[class*=saludFila]").first.click()
        assert page.locator("#modelo-fv_RandomForestSet_bestModel").get_attribute("open") is not None
        assert page.locator("details[class*=historico]").get_attribute("open") is None
        print(f"[{t}] detalle: acordeón, mini-ranking e histórico colapsado OK")

        # 6. aviso de drift dentro del Model Card y su link de vuelta
        page.goto(f"{BASE}/docs/coeaa_riesgo_consumo/lgd_GLM_bestModel/model-card")
        aviso = page.locator("aside[aria-label='Ficha del modelo']")
        assert "desactualizado (55 días)" in aviso.inner_text()
        aviso.get_by_role("link", name="Ver la salud del modelo").click()
        page.wait_for_url("**/knowledge-center/proyecto/coeaa_riesgo_consumo#modelo-lgd_GLM_bestModel")
        print(f"[{t}] aviso de drift en el Model Card + link OK")

        # 7. actividad del portafolio sin jerga de commits
        page.goto(f"{BASE}/portafolio")
        actividad = page.locator("[class*=actividad]").inner_text()
        for prefijo in ("chore:", "feat(", "docs("):
            assert prefijo not in actividad, prefijo
        assert "Proyecto creado" in actividad and "Reentrenamiento de lgd_GLM_bestModel" in actividad
        print(f"[{t}] actividad legible OK")

        # docs intro sin emoji
        page.goto(f"{BASE}/docs/intro")
        assert "🏠" not in page.locator("body").inner_text()
        page.goto(f"{BASE}/")
        page.screenshot(path=OUT / f"dashboard-{t}.png", full_page=True)
        ctx.close()

    ctx = b.new_context(viewport={"width": 390, "height": 844})
    page = ctx.new_page()
    for ruta in ("/", "/proyecto/coeaa_riesgo_consumo", "/proyecto/coaa_pyneg_demo_activos", "/portafolio"):
        page.goto(BASE + ruta)
        ancho = page.evaluate("document.documentElement.scrollWidth")
        assert ancho <= 390, (ruta, ancho)
    page.goto(BASE + "/")
    page.screenshot(path=OUT / "dashboard-mobile.png", full_page=True)
    print("móvil OK: sin overflow en 4 páginas")
    b.close()

print("errores de consola:", errores or "ninguno")
