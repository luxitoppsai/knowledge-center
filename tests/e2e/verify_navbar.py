"""Navbar: exactamente un item activo, el correcto, en cada tipo de página."""
import sys
from playwright.sync_api import sync_playwright
BASE = sys.argv[1].rstrip("/")
CASOS = {"/": "Dashboard", "/?estado=produccion": "Dashboard", "/proyecto/coeaa_riesgo_consumo": None,
         "/portafolio": "Portafolio", "/linaje": "Linaje", "/docs/intro": "Documentación",
         "/docs/coeaa_riesgo_consumo/pd_XGBoost_bestModel/model-card": "Documentación", "/no-existe": None}
with sync_playwright() as pw:
    b = pw.chromium.launch()
    p = b.new_page(viewport={"width": 1440, "height": 900})
    for ruta, esperado in CASOS.items():
        p.goto(BASE + ruta); p.wait_for_load_state("networkidle")
        activos = p.locator("nav.navbar .navbar__link--active").all_inner_texts()
        assert activos == ([esperado] if esperado else []), (ruta, activos)
    print("navbar OK: un solo item activo y correcto en", len(CASOS), "rutas")
    b.close()
