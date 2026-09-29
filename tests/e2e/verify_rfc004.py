"""Verificación de RFC-004 con clics reales. Uso: python verify_rfc004.py <base_url> <out>"""

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE, OUT = sys.argv[1].rstrip("/"), Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
errores = []
CARD = "/docs/coeaa_riesgo_consumo/lgd_GLM_bestModel/model-card"

with sync_playwright() as pw:
    b = pw.chromium.launch()
    for t in ("light", "dark"):
        ctx = b.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()
        page.on("console", lambda m: m.type == "error" and errores.append(f"[{t}] {m.text[:200]}"))
        page.on("pageerror", lambda e: errores.append(f"[{t}] {e}"))
        page.goto(f"{BASE}/")
        page.evaluate(f"localStorage.setItem('theme', '{t}')")
        page.reload()
        assert page.evaluate("document.documentElement.dataset.theme") == t

        # navbar sin GitHub, footer liviano con fecha
        assert page.locator("nav.navbar a", has_text="GitHub").count() == 0
        pie = page.locator("footer").inner_text()
        assert "datos al" in pie, pie
        assert "footer--dark" not in (page.locator("footer").get_attribute("class") or "")

        # copy de cards y +N
        cards = " ".join(page.locator("article").all_inner_texts())
        assert "salud del peor modelo" not in cards and "drift" not in cards
        fila = page.locator("[aria-labelledby=atencion-titulo] li").first
        assert "ct_LogisticRegression_bestModel" in fila.inner_text()
        assert fila.locator("[class*=mas]").inner_text() == "+3"
        print(f"[{t}] navbar, footer, copy y +N OK")

        # ficha en el Model Card, con drift, y markdown sin admonition de drift
        page.goto(BASE + CARD)
        ficha = page.locator("aside[aria-label='Ficha del modelo']")
        txt = ficha.inner_text()
        for esperado in ("Riesgo Consumo", "60", "GLM", "16 jul", "desactualizado (55 días)"):
            assert esperado in txt, (esperado, txt)
        assert page.locator(".theme-admonition-warning").count() == 0
        page.screenshot(path=OUT / f"modelcard-{t}.png", full_page=True)
        ficha.get_by_role("link", name="Ver la salud del modelo").click()
        page.wait_for_url("**/proyecto/coeaa_riesgo_consumo#modelo-lgd_GLM_bestModel")
        # linaje y funciones: ficha sin aviso
        page.goto(BASE + "/docs/coeaa_riesgo_consumo/lgd_GLM_bestModel/lineage")
        ficha = page.locator("aside[aria-label='Ficha del modelo']")
        assert "linaje" in ficha.inner_text().lower() and "desactualizado" not in ficha.inner_text()
        page.goto(BASE + "/docs/intro")
        assert page.locator("aside[aria-label='Ficha del modelo']").count() == 0
        print(f"[{t}] ficha en Model Card (con drift), linaje (sin aviso) e intro (sin ficha) OK")

        # detalle con 1 modelo: sin mini-ranking
        page.goto(BASE + "/proyecto/coaa_churn_tarjetas")
        assert page.get_by_role("heading", name="Salud de los modelos").count() == 0
        page.goto(BASE + "/proyecto/coaa_pyneg_demo_activos")
        assert page.get_by_role("heading", name="Salud de los modelos").count() == 1
        page.screenshot(path=OUT / f"pyneg-{t}.png", full_page=True)
        print(f"[{t}] detalle sin redundancia OK")
        ctx.close()

    # táctil: chips ≥ 44 px
    ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True)
    page = ctx.new_page()
    page.goto(BASE + "/")
    alturas = page.locator("[class*=chip_]").evaluate_all("els => els.map(e => e.getBoundingClientRect().height)")
    assert alturas and min(alturas) >= 44, alturas
    for ruta in ("/", CARD, "/proyecto/coeaa_riesgo_consumo"):
        page.goto(BASE + ruta)
        assert page.evaluate("document.documentElement.scrollWidth") <= 390, ruta
    page.goto(BASE + CARD)
    page.screenshot(path=OUT / "modelcard-mobile.png", full_page=True)
    print(f"táctil OK: chips min {min(alturas):.0f}px; sin overflow")
    b.close()

print("errores de consola:", errores or "ninguno")
