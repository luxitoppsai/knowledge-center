"""RFC-005: clics reales, teclado, temas y móvil con fixture local reproducible.

Uso: python tests/e2e/verify_ux.py <base_url> <capturas> <catalogo_fixture>
"""

import json
import re
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE, OUT, CATALOGO = sys.argv[1].rstrip("/"), Path(sys.argv[2]), Path(sys.argv[3])
OUT.mkdir(parents=True, exist_ok=True)
catalogo = json.loads(CATALOGO.read_text())
modelos = [(p, m) for p in catalogo for m in p["modelos"]]
pendientes = [(p, m) for p, m in modelos if m["salud"]["nivel"] != "saludable"]
drift = [(p, m) for p, m in modelos if m["drift"]]
errores, errores_red = [], []


def abrir(page, ruta="/"):
    page.goto(BASE + ruta, wait_until="networkidle")


def capturar(page, nombre):
    page.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
    page.screenshot(path=str(OUT / nombre), full_page=True)


def sin_desbordamiento(page):
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), page.url


with sync_playwright() as pw:
    browser = pw.chromium.launch()
    for tema in ("light", "dark"):
        for movil in (False, True):
            contexto = browser.new_context(
                viewport={"width": 390 if movil else 1440, "height": 844 if movil else 1000},
                has_touch=movil, is_mobile=movil,
                permissions=["clipboard-read", "clipboard-write"],
            )
            contexto.add_init_script(f"localStorage.setItem('theme', '{tema}')")
            page = contexto.new_page()
            page.on("pageerror", lambda e: errores.append(str(e)))
            page.on("console", lambda m: errores.append(m.text) if m.type == "error" and "net::ERR" not in m.text else None)
            page.on("requestfailed", lambda r: errores_red.append(r.url) if not r.url.startswith(BASE) else errores.append(r.url))
            prefijo = f"{tema}-{'movil' if movil else 'desktop'}"
            abrir(page)
            assert page.evaluate("document.documentElement.dataset.theme") == tema
            sin_desbordamiento(page)
            capturar(page, f"dashboard-inicial-{prefijo}.png")
            expect(page.locator("#proyectos-titulo [role=status]")).to_have_text(f"{len(catalogo)} de {len(catalogo)} proyectos")
            explicacion = page.locator("details").filter(has=page.get_by_text("¿Qué mide la salud documental?", exact=True))
            explicacion.locator("summary").focus()
            page.keyboard.press("Enter")
            expect(explicacion).to_have_attribute("open", "")
            expect(explicacion).to_contain_text("No verifica la calidad")
            explicacion.locator("summary").click()

            # Los motivos se revelan por teclado/toque, fuera del link de la fila.
            fila = page.locator("[aria-labelledby='atencion-titulo'] > ul > li").first
            extra = fila.locator("details").first
            extra.locator("summary").focus()
            page.keyboard.press("Enter")
            expect(extra).to_have_attribute("open", "")
            expect(extra.locator("li")).to_have_count(len(pendientes[0][1]["salud"]["motivos"]) - 1)
            ayuda = fila.locator("details").filter(has=page.get_by_text("Ver cómo actualizarlo", exact=True))
            ayuda.locator("summary").click()
            ayuda.get_by_role("button", name="Copiar comando").click()
            expect(ayuda.get_by_role("status")).to_have_text("Copiado")
            assert page.evaluate("navigator.clipboard.readText()") == "/generar-model-card"
            ayuda.get_by_role("link", name="Ver la guía completa").click()
            expect(page.get_by_role("heading", name="Actualizar un Model Card", exact=True)).to_be_visible()
            abrir(page)

            # Los KPI de modelos no aplican filtros de proyectos que puedan esconderlos.
            page.get_by_role("link", name=re.compile("Ver documentos por revisar")).click()
            expect(page.locator("[aria-labelledby='atencion-titulo'] > ul > li")).to_have_count(len(drift))
            page.get_by_role("link", name=re.compile("Ver modelos pendientes")).click()
            expect(page.locator("[aria-labelledby='atencion-titulo'] > ul > li")).to_have_count(min(5, len(pendientes)))
            page.get_by_role("link", name=re.compile("Filtrar proyectos")).click()
            expect(page.get_by_role("group", name="Estado del proyecto").get_by_role("button", name=re.compile("Producción"))).to_have_attribute("aria-pressed", "true")
            n_prod = sum(p["estado"] == "produccion" for p in catalogo)
            expect(page.locator("article")).to_have_count(n_prod)
            titulos = page.locator("article h3").all_text_contents()
            page.get_by_role("button", name="Tabla", exact=True).click()
            tabla = page.get_by_role("region", name="Tabla de proyectos")
            assert tabla.locator("tbody th").all_text_contents() == titulos
            sin_desbordamiento(page)
            page.reload(wait_until="networkidle")
            expect(page.get_by_role("button", name="Tabla", exact=True)).to_have_attribute("aria-pressed", "true")
            tabla.get_by_role("link", name=titulos[0], exact=True).click()
            expect(page.get_by_role("heading", name=titulos[0], exact=True)).to_be_visible()
            abrir(page)

            # Los grupos de filtros y las vistas comparten conteos y resultados.
            grupo = page.get_by_role("group", name="Salud documental del proyecto")
            grupo.get_by_role("button", name=re.compile("Crítico")).click()
            expect(page.locator("article")).to_have_count(sum(p["salud"]["nivel"] == "critico" for p in catalogo))
            page.get_by_role("button", name="Limpiar filtros", exact=True).click()
            expect(page.locator("article")).to_have_count(len(catalogo))
            muchos = next(p for p in catalogo if p["n_modelos"] > 3)
            tarjeta = page.locator("article").filter(has=page.get_by_role("heading", name=muchos["nombre"], exact=True))
            expect(tarjeta.get_by_role("list", name="Modelos").locator("li")).to_have_count(3)
            tarjeta.get_by_role("link", name=re.compile("Ver (el otro|los otros)")).click()
            expect(page.get_by_role("heading", name=f"Modelos ({muchos['n_modelos']})", exact=True)).to_be_visible()
            largo = max(muchos["modelos"], key=lambda m: len(m["nombre"]))
            bloque = page.locator(f"#modelo-{largo['nombre']}")
            bloque.locator(":scope > summary").click()
            bloque.get_by_role("button", name=f"Copiar identificador {largo['nombre']}").click()
            assert page.evaluate("navigator.clipboard.readText()") == largo["nombre"]
            sin_desbordamiento(page)
            capturar(page, f"detalle-{prefijo}.png")

            # Documento: orden narrativo real, TOC coherente y aviso que no inventa reentrenamiento.
            proyecto, modelo = drift[0]
            abrir(page, f"/proyecto/{proyecto['slug']}")
            page.get_by_role("link", name="Abrir Model Card →", exact=True).click()
            ficha = page.get_by_role("complementary", name="Ficha del modelo")
            expect(ficha).to_contain_text("Documentación posiblemente desactualizada")
            assert "reentrenó" not in ficha.inner_text()
            headings = [h.rstrip("# \u200b") for h in page.locator(".markdown h2").all_text_contents()]
            assert headings.index("Propósito y uso previsto") < headings.index("Métricas") < headings.index("Identidad"), headings
            sin_desbordamiento(page)
            capturar(page, f"model-card-{prefijo}.png")
            ficha.get_by_role("link", name="Revisar el modelo").click()
            expect(page.locator(f"#modelo-{modelo['nombre']}")).to_have_attribute("open", "")

            # Linaje: selection por teclado/toque, panel con nombres completos y limpieza real.
            abrir(page, "/linaje")
            expect(page.get_by_role("heading", name="¿Qué modelos dependen de esta tabla?")).to_be_visible()
            tabla_id = modelo["sources"]["table_list"][0]
            if movil:
                page.locator("[class*='listaMovil']").get_by_role("button", name="core.hm_clientes", exact=True).click()
            else:
                nodo = page.get_by_role("button", name=re.compile(f"Tabla {tabla_id}"))
                nodo.focus()
                page.keyboard.press("Enter")
            panel = page.locator("#impacto")
            expect(panel.get_by_role("heading", name=tabla_id, exact=True)).to_be_visible()
            expect(panel.get_by_role("link", name=largo["nombre"], exact=True)).to_be_visible()
            assert panel.get_by_role("link", name=largo["nombre"], exact=True).evaluate("el => getComputedStyle(el).whiteSpace") == "normal"
            sin_desbordamiento(page)
            capturar(page, f"linaje-{prefijo}.png")
            page.get_by_role("button", name="Limpiar selección", exact=True).click()
            expect(panel.get_by_role("heading", name="Análisis de impacto")).to_be_visible()
            assert "tabla=" not in page.url and "modelo=" not in page.url

            # Portafolio: orden, motivos por clic, eventos expandibles y leyenda numérica.
            abrir(page, "/portafolio")
            ranking = page.get_by_role("heading", name="Salud documental por modelo", exact=True)
            actividad = page.get_by_role("heading", name="Actividad reciente", exact=True)
            assert ranking.bounding_box()["y"] < actividad.bounding_box()["y"]
            page.get_by_role("button", name=re.compile("Ver motivos de")).first.click()
            expect(page.locator("[class*='tooltip']")).to_contain_text(pendientes[0][1]["nombre"])
            expect(page.locator("[class*='actividad'] > li")).to_have_count(5)
            page.get_by_role("button", name=re.compile("eventos más")).click()
            expect(page.locator("[class*='actividad'] > li")).to_have_count(sum(len(p["historial"]) for p in catalogo))
            page.get_by_role("button", name="Ver menos actividad").click()
            evento = page.locator("[class*='actividad'] details").first
            evento.locator("summary").click()
            expect(evento.get_by_role("link", name="Ver cambio en el repositorio ↗")).to_be_visible()
            leyenda = page.get_by_label("Leyenda: cantidad de proyectos por celda")
            expect(leyenda).to_contain_text("0 proyectos")
            assert "Más oscuro" not in page.locator("body").inner_text()
            sin_desbordamiento(page)
            capturar(page, f"portafolio-{prefijo}.png")
            page.evaluate("window.__impreso = false; window.print = () => {window.__impreso = true}")
            page.get_by_role("button", name="Imprimir / Guardar PDF").click()
            assert page.evaluate("window.__impreso")
            page.emulate_media(media="print")
            expect(page.locator("nav.navbar")).not_to_be_visible()
            expect(page.locator("[class*='tablaImpresion'] table")).to_be_visible()
            if not movil and tema == 'dark':
                page.pdf(path=str(OUT / 'portafolio.pdf'), format='A4', print_background=True,
                         margin={'top': '12mm', 'bottom': '12mm', 'left': '12mm', 'right': '12mm'})
            page.emulate_media(media="screen")
            if movil:
                abrir(page)
                controles = page.locator("fieldset button")
                assert min(controles.evaluate_all("els => els.map(el => el.getBoundingClientRect().height)")) >= 44
            abrir(page)
            capturar(page, f"dashboard-{prefijo}.png")
            print(f"{prefijo}: flujos, copia, filtros, tabla, linaje, impresión y ancho OK")
            contexto.close()
    browser.close()

assert not errores, errores
print("Errores de aplicación: ninguno")
print("Fallos de red externos:", sorted(set(errores_red)))
