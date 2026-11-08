"""
Procesa las fotos de las prendas para El Closet de Silmar.

Para cada foto de la carpeta de entrada:
  1. Quita el fondo (pared, manchas, sombras) con rembg.
  2. Quita el gancho: lo que asoma arriba, las pinzas y la barra dentro del cuello.
  3. Recorta al contorno de la prenda.
  4. La centra en un lienzo vertical 3:4 con margen uniforme.
  5. La exporta en WebP con transparencia, liviana para datos móviles.

Uso:
    python scripts/procesar_fotos.py fotos/originales fotos/procesadas

Requisitos (una sola vez):
    pip install -r scripts/requirements.txt
La primera ejecución descarga el modelo de recorte (unos 180 MB).
"""

import hashlib
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from rembg import new_session, remove

ANCHO, ALTO = 810, 1080      # lienzo final 3:4, nítido en teléfonos y liviano
MARGEN_LATERAL = 0.07        # aire a cada lado
MARGEN_SUPERIOR = 0.05       # la prenda cuelga cerca del borde de arriba
MARGEN_INFERIOR = 0.05
CALIDAD_WEBP = 78
EXTENSIONES = {".jpg", ".jpeg", ".png", ".webp", ".heic"}


def quitar_gancho(rgba: Image.Image) -> Image.Image:
    """El gancho es delgado; la prenda es ancha. Borra todo lo que esté por
    encima de la primera fila donde la prenda ya ocupa un ancho considerable."""
    alfa = np.array(rgba.getchannel("A"))
    cobertura = (alfa > 128).sum(axis=1)
    if cobertura.max() == 0:
        return rgba
    umbral = cobertura.max() * 0.22
    filas = np.where(cobertura > umbral)[0]
    if len(filas) == 0:
        return rgba
    inicio = max(filas[0] - 6, 0)
    alfa[:inicio, :] = 0
    limpia = rgba.copy()
    limpia.putalpha(Image.fromarray(alfa))
    return limpia


def limpiar_gancho(rgba: Image.Image) -> Image.Image:
    """Quita lo que queda del gancho: puntas sobre el cuello, pinzas del pantalón
    y la barra blanca que se ve por dentro del cuello."""
    a = np.array(rgba); rgb = a[..., :3].copy(); al = a[..., 3]
    prenda = al > 128
    visible = al > 20  # los bordes del gancho suelen quedar semitransparentes
    ys, xs = np.where(prenda)
    if len(ys) == 0: return rgba
    y0, y1 = ys.min(), ys.max(); h = y1 - y0
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    claro = (hsv[..., 2] > 150) & (hsv[..., 1] < 50) & visible
    # 1. Restos del gancho o pinzas en el borde superior: se vuelven transparentes
    arriba = claro.copy(); arriba[y0 + int(h * 0.07):, :] = False
    n, lab, st, _ = cv2.connectedComponentsWithStats(arriba.astype(np.uint8), 8)
    quitar = np.zeros_like(prenda)
    for i in range(1, n):
        if st[i, 4] > 15: quitar |= lab == i
    quitar = cv2.dilate(quitar.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
    al = np.where(quitar, 0, al)
    # 2. Barra del gancho por dentro del cuello: larga y delgada; se rellena con el color de alrededor
    barra = (hsv[..., 2] > 200) & (hsv[..., 1] < 40) & prenda
    barra[y0 + int(h * 0.35):, :] = False
    n, lab, st, _ = cv2.connectedComponentsWithStats(barra.astype(np.uint8), 8)
    m = np.zeros(prenda.shape, np.uint8)
    for i in range(1, n):
        x, y, w, hh, area = st[i]
        if area > 150 and w > hh * 4: m[lab == i] = 255
    if m.any():
        m = cv2.dilate(m, np.ones((7, 7), np.uint8))
        rgb = cv2.inpaint(rgb, m, 9, cv2.INPAINT_TELEA)
    a[..., :3] = rgb; a[..., 3] = al
    return Image.fromarray(a)


def encuadrar(rgba: Image.Image) -> Image.Image:
    caja = rgba.getbbox()
    if caja:
        rgba = rgba.crop(caja)
    util_w = ANCHO * (1 - 2 * MARGEN_LATERAL)
    util_h = ALTO * (1 - MARGEN_SUPERIOR - MARGEN_INFERIOR)
    escala = min(util_w / rgba.width, util_h / rgba.height)
    nuevo = rgba.resize(
        (round(rgba.width * escala), round(rgba.height * escala)),
        Image.LANCZOS,
    )
    lienzo = Image.new("RGBA", (ANCHO, ALTO), (0, 0, 0, 0))
    x = (ANCHO - nuevo.width) // 2
    y = round(ALTO * MARGEN_SUPERIOR)
    lienzo.alpha_composite(nuevo, (x, y))
    return lienzo


def procesar(entrada: Path, salida: Path) -> None:
    salida.mkdir(parents=True, exist_ok=True)
    # Las copias tipo "foto (1).jpg" van al final para conservar el nombre original
    fotos = sorted(
        (p for p in entrada.iterdir() if p.suffix.lower() in EXTENSIONES),
        key=lambda p: (" (" in p.name, p.name),
    )
    if not fotos:
        print(f"No encontré fotos en {entrada}")
        return
    sesion = None
    vistas = set()
    for i, foto in enumerate(fotos, 1):
        destino = salida / f"{foto.stem}.webp"
        huella = hashlib.md5(foto.read_bytes()).hexdigest()
        if huella in vistas:
            print(f"[{i}/{len(fotos)}] {foto.name}: duplicada, se omite")
            continue
        vistas.add(huella)
        if destino.exists():
            print(f"[{i}/{len(fotos)}] {foto.name}: ya procesada")
            continue
        print(f"[{i}/{len(fotos)}] {foto.name} -> {destino.name}")
        sesion = sesion or new_session("isnet-general-use")
        imagen = Image.open(foto).convert("RGB")
        imagen.thumbnail((1500, 2000))  # suficiente para el lienzo final y mucho más rápido
        recortada = remove(imagen, session=sesion, post_process_mask=True)
        final = encuadrar(limpiar_gancho(quitar_gancho(recortada)))
        final.save(destino, "WEBP", quality=CALIDAD_WEBP, method=6)
    print(f"Listo: {len(vistas)} fotos en {salida}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    procesar(Path(sys.argv[1]), Path(sys.argv[2]))
