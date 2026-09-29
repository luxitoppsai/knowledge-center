"""Verificación T12 con clics reales. Uso: python verify_linaje.py <base_url> <out_dir>"""

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE, OUT = sys.argv[1].rstrip("/"), Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
errores = []


def kpis(page):
    vals = page.locator("#impacto strong").all_inner_texts()
    return dict(zip(["modelos", "proyectos", "prod", "criticos"], map(int, vals)))


with sync_playwright() as pw:
    b = pw.chromium.launch()
    for tema in ("light", "dark"):
        ctx = b.new_context(viewport={"width": 1360, "height": 900})
        page = ctx.new_page()
        page.on("console", lambda m: m.type == "error" and errores.append(f"[{tema}] {m.text}"))
        page.on("pageerror", lambda e: errores.append(f"[{tema}] {e}"))
        page.goto(f"{BASE}/")
        page.evaluate(f"localStorage.setItem('theme', '{tema}')")
        page.reload()
        assert page.evaluate("document.documentElement.dataset.theme") == tema
        # navegación SPA real desde la navbar (lección RFC-001 §11)
        page.get_by_role("link", name="Linaje", exact=True).click()
        page.wait_for_url("**/linaje")
        page.wait_for_selector("svg[role=group]")

        # clic en tabla compartida entre 4 proyectos
        page.get_by_role("button", name="Tabla catalog.core.hm_clientes").click()
        assert "tabla=catalog.core.hm_clientes" in page.url, page.url
        k = kpis(page)
        assert k == {"modelos": 4, "proyectos": 4, "prod": 2, "criticos": 0}, k
        dim = page.locator("svg g[class*=dim_]").count()
        n_nodos = page.locator('svg g[role=button]').count()
        assert dim == n_nodos - 1 - 4, (dim, n_nodos)  # todo atenuado menos la tabla y sus 4 modelos
        page.screenshot(path=OUT / f"linaje-hm_clientes-{tema}.png", full_page=True)
        print(f"[{tema}] tabla OK: {k}, {dim} nodos atenuados")

        # dirección inversa: clic en un modelo resalta sus tablas
        page.get_by_role("button", name="Modelo churn_LightGBM_bestModel", exact=False).click()
        assert "Depende de 3 tablas" in page.locator("#impacto").inner_text()
        print(f"[{tema}] modelo OK: churn depende de 3 tablas")

        # buscador + Enter
        page.get_by_label("Buscar tabla").fill("garant")
        page.keyboard.press("Enter")
        assert "tabla=catalog.riesgos.hm_garantias" in page.url
        assert kpis(page)["modelos"] == 1
        print(f"[{tema}] buscador OK")

        # teclado: Tab hasta un nodo + Enter
        page.get_by_role("button", name="Tabla catalog.tarjetas.hm_consumos").focus()
        page.keyboard.press("Enter")
        assert kpis(page) == {"modelos": 2, "proyectos": 2, "prod": 1, "criticos": 0}, kpis(page)
        print(f"[{tema}] teclado OK")
        ctx.close()

    # llegada desde el detalle: link de la tabla → /linaje?tabla= ya seleccionada
    ctx = b.new_context(viewport={"width": 1360, "height": 900})
    page = ctx.new_page()
    page.goto(f"{BASE}/proyecto/coaa_churn_tarjetas")
    page.get_by_role("link", name="catalog.medios_pago.hm_pagos").click()
    page.wait_for_url("**/linaje?tabla=catalog.medios_pago.hm_pagos")
    assert kpis(page)["proyectos"] == 2, kpis(page)
    print("detalle → linaje OK: hm_pagos preseleccionada, 2 proyectos")

    # móvil: lista en vez de grafo, sin overflow
    ctx = b.new_context(viewport={"width": 400, "height": 850})
    page = ctx.new_page()
    page.goto(f"{BASE}/linaje")
    assert not page.locator("svg[role=group]").is_visible()
    page.get_by_role("button", name="core.hm_clientes").first.click()
    assert kpis(page)["modelos"] == 4
    assert page.evaluate("document.documentElement.scrollWidth") <= 400
    page.screenshot(path=OUT / "linaje-mobile.png", full_page=True)
    print("móvil OK")
    b.close()

print("errores de consola:", errores or "ninguno")
