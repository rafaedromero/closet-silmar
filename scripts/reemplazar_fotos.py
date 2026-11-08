"""
Reemplaza en el catálogo la foto de prendas que ya están cargadas, por ejemplo
después de retocarlas. No cambia nombres, precios ni nada de lo que Silmar
editó en el panel: solo sube la imagen nueva encima de la anterior.

Uso:
    python scripts/reemplazar_fotos.py --hoy                 # las fotos de fotos/procesadas cambiadas hoy
    python scripts/reemplazar_fotos.py PXL_..._211617347      # una o varias por nombre
    python scripts/reemplazar_fotos.py --hoy --probar         # solo muestra qué haría

Si la foto no mide 810×1080 la ajusta a ese tamaño (sin tocar tu archivo).
Usa la misma clave de scripts/.env.carga que cargar_prendas.py.
"""

import io
import sys
import urllib.parse
from datetime import date, datetime
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cargar_prendas import FOTOS, Supabase, leer_config  # noqa: E402

ANCHO, ALTO = 810, 1080
CALIDAD = 78


def preparar(archivo):
    """Devuelve los bytes WebP listos para subir y una nota si hubo que ajustarla."""
    img = Image.open(archivo)
    img.load()
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    nota = ""
    if img.size != (ANCHO, ALTO):
        nota = f"ajustada de {img.width}×{img.height}"
        if img.width < ANCHO:
            nota += " (se agrandó: si puedes, expórtala a 810×1080 o más)"
        lienzo = Image.new("RGBA", (ANCHO, ALTO), (0, 0, 0, 0))
        copia = img.copy()
        escala = min(ANCHO / img.width, ALTO / img.height)
        copia = copia.resize((round(img.width * escala), round(img.height * escala)), Image.LANCZOS)
        lienzo.paste(copia, ((ANCHO - copia.width) // 2, (ALTO - copia.height) // 2), copia)
        img = lienzo
    salida = io.BytesIO()
    img.save(salida, "WEBP", quality=CALIDAD, method=6)
    return salida.getvalue(), nota


def elegir(args):
    if "--hoy" in args:
        hoy = date.today()
        return sorted(f for f in FOTOS.glob("*.webp") if datetime.fromtimestamp(f.stat().st_mtime).date() == hoy)
    elegidas = []
    for nombre in (a for a in args if not a.startswith("--")):
        f = FOTOS / (nombre if nombre.endswith(".webp") else nombre + ".webp")
        if not f.exists():
            sys.exit(f"No encuentro {f.relative_to(FOTOS.parent.parent)}")
        elegidas.append(f)
    return elegidas


def main():
    args = sys.argv[1:]
    fotos = elegir(args)
    if not fotos:
        sys.exit("No hay fotos para subir. Usa --hoy o escribe los nombres.")
    probar = "--probar" in args

    sb = None if probar else Supabase(*leer_config())
    for f in fotos:
        datos, nota = preparar(f)
        if sb:
            if not sb.prenda_de_foto(f.name):
                print(f"  ✗ {f.name}: no hay ninguna prenda con esta foto (para prendas nuevas usa cargar_prendas.py)")
                continue
            ruta = f"/storage/v1/object/prendas/{urllib.parse.quote(f.name)}"
            sb._pedir("POST", ruta, datos, {"Content-Type": "image/webp", "x-upsert": "true", "cache-control": "300"})
        print(f"  ✓ {f.name}  {len(datos) // 1024} KB {nota}")
    print("\nListo." if sb else "\nPrueba: no se subió nada.")


if __name__ == "__main__":
    main()
