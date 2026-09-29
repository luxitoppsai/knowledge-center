"""Verificación T13 con clics reales. Uso: python verify_portafolio.py <base_url> <out_dir>"""

import pathlib
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE, OUT = sys.argv[1].rstrip("/"), Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
errores = []

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
        pct_dash = page.locator("text=modelos saludables").locator("xpath=..").inner_text().split("\n")[0]

        page.get_by_role("link", name="Portafolio", exact=True).click()
        page.wait_for_url("**/portafolio")
        hero = page.locator("[class*=heroValor]").inner_text()
        assert hero == pct_dash, (hero, pct_dash)
        kpis = page.locator("[class*=kpiValor]").all_inner_texts()
        import json
        cat = json.loads((pathlib.Path(__file__).resolve().parents[2] / "src/data/catalog.json").read_text())
        mods = [m for p_ in cat for m in p_["modelos"]]
        tablas = {t_ for m in mods for t_ in m["sources"]["table_list"]}
        esperado = [str(len(cat)), str(len(mods)), str(sum(1 for m in mods if m["drift"])), str(len(tablas)), "3"]
        assert kpis == esperado, (kpis, esperado)
        print(f"[{tema}] KPIs OK: hero {hero} = dashboard, {kpis}")

        # hover en la peor barra → motivos
        page.locator("[class*=fila_]").first.hover()
        tip = page.locator("[class*=tooltip]").inner_text()
        assert "ct_LogisticRegression_bestModel" in tip and "Genera el Model Card" in tip, tip
        print(f"[{tema}] tooltip OK")
        page.screenshot(path=OUT / f"portafolio-{tema}.png", full_page=True)

        # clic en celda de la matriz → dashboard filtrado
        page.get_by_title("1 proyecto de an_riesgos en producción", exact=False).click()
        page.wait_for_url("**/?area=an_riesgos&estado=produccion")
        titulos = page.locator("article h3").all_inner_texts()
        assert titulos == ["Riesgo Consumo"], titulos
        assert page.locator("select").first.input_value() == "an_riesgos"
        print(f"[{tema}] matriz → dashboard filtrado OK: {titulos}")

        # cambiar filtro en el dashboard actualiza la URL
        page.locator("select").first.select_option("")
        assert "area=" not in page.url and "estado=produccion" in page.url, page.url
        assert page.locator("article").count() == 2
        print(f"[{tema}] filtro → URL OK")
        ctx.close()

    # PDF A4 para comité
    ctx = b.new_context()
    page = ctx.new_page()
    page.goto(f"{BASE}/portafolio")
    page.emulate_media(media="print")
    page.screenshot(path=OUT / "portafolio-print.png", full_page=True)
    page.pdf(path=OUT / "portafolio.pdf", format="A4", print_background=True)
    assert not page.locator("nav.navbar").is_visible()
    print("print OK: navbar oculta, PDF A4 generado")

    ctx = b.new_context(viewport={"width": 400, "height": 850})
    page = ctx.new_page()
    page.goto(f"{BASE}/portafolio")
    assert page.evaluate("document.documentElement.scrollWidth") <= 400, page.evaluate("document.documentElement.scrollWidth")
    page.screenshot(path=OUT / "portafolio-mobile.png", full_page=True)
    print("móvil OK")
    b.close()

print("errores de consola:", errores or "ninguno")
