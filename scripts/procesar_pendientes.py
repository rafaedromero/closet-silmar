"""
Procesa las fotos que Silmar subió desde el panel y que esperan ser procesadas.

Uso:
    python scripts/procesar_pendientes.py
        Descarga cada foto pendiente, le quita fondo y gancho, la sube lista
        y la deja como foto principal. Silmar ya puede publicar la prenda.

    python scripts/procesar_pendientes.py --revisar
        Solo procesa y guarda en fotos/pendientes/ para que las revises o
        retoques (por ejemplo en Photoshop) sin subir nada.

    python scripts/procesar_pendientes.py --subir-revisadas
        Sube lo que haya en fotos/pendientes/ (tal como quedó tras tu retoque).

Usa la misma configuración que cargar_prendas.py (scripts/.env.carga).
"""

import io
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image
from rembg import new_session, remove

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cargar_prendas import Supabase, leer_config  # noqa: E402
from procesar_fotos import CALIDAD_WEBP, encuadrar, limpiar_gancho, quitar_gancho  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
REVISION = RAIZ / "fotos" / "pendientes"


def pendientes(sb):
    return sb._pedir(
        "GET",
        "/rest/v1/prenda_fotos?procesada=eq.false&select=id,prenda_id,ruta,prendas(ref,nombre)&order=creada_en",
    )


def descargar(sb, ruta):
    url = f"{sb.url}/storage/v1/object/authenticated/originales/{urllib.parse.quote(ruta)}"
    pedido = urllib.request.Request(url, headers=sb.base)
    with urllib.request.urlopen(pedido, timeout=120) as r:
        return r.read()


def procesar(bytes_originales, sesion):
    imagen = Image.open(io.BytesIO(bytes_originales)).convert("RGB")
    imagen.thumbnail((1500, 2000))
    recortada = remove(imagen, session=sesion, post_process_mask=True)
    return encuadrar(limpiar_gancho(quitar_gancho(recortada)))


def subir(sb, foto, imagen_webp: bytes):
    nombre = f"{foto['prenda_id']}-{int(time.time())}.webp"  # nombre nuevo: evita fotos viejas en caché
    sb._pedir(
        "POST",
        f"/storage/v1/object/prendas/{nombre}",
        imagen_webp,
        {"Content-Type": "image/webp", "cache-control": "31536000"},
    )
    # Primero se quita la marca de principal a la foto anterior (solo puede haber una)
    sb._pedir("PATCH", f"/rest/v1/prenda_fotos?prenda_id=eq.{foto['prenda_id']}&principal=is.true", {"principal": False})
    sb._pedir(
        "PATCH",
        f"/rest/v1/prenda_fotos?id=eq.{foto['id']}",
        {"ruta": nombre, "procesada": True, "principal": True},
    )


def a_webp(imagen):
    salida = io.BytesIO()
    imagen.save(salida, "WEBP", quality=CALIDAD_WEBP, method=6)
    return salida.getvalue()


def etiqueta(foto):
    p = foto.get("prendas") or {}
    return f"Ref {p.get('ref', 0):03d} {p.get('nombre', '')}"


def main():
    sb = Supabase(*leer_config())
    lista = pendientes(sb)

    if "--subir-revisadas" in sys.argv:
        por_id = {f["id"]: f for f in lista}
        archivos = sorted(REVISION.glob("*.webp"))
        if not archivos:
            print(f"No hay fotos en {REVISION.relative_to(RAIZ)}")
        for archivo in archivos:
            foto = por_id.get(archivo.stem.split("__")[0])
            if not foto:
                print(f"  · {archivo.name}: ya no está pendiente, se omite")
                continue
            subir(sb, foto, archivo.read_bytes())
            print(f"  ✓ {etiqueta(foto)}: subida")
        return

    if not lista:
        print("No hay fotos pendientes.")
        return
    revisar = "--revisar" in sys.argv
    if revisar:
        REVISION.mkdir(parents=True, exist_ok=True)
    print(f"{len(lista)} foto(s) pendiente(s)")
    sesion = new_session("isnet-general-use")
    for foto in lista:
        print(f"  … {etiqueta(foto)}")
        lista_webp = a_webp(procesar(descargar(sb, foto["ruta"]), sesion))
        if revisar:
            ref = (foto.get("prendas") or {}).get("ref", 0)
            destino = REVISION / f"{foto['id']}__ref{ref:03d}.webp"
            destino.write_bytes(lista_webp)
            print(f"  ✓ guardada en {destino.relative_to(RAIZ)}")
        else:
            subir(sb, foto, lista_webp)
            print("  ✓ procesada y subida")
    if revisar:
        print("\nRevisa o retoca las fotos sin cambiarles el nombre y luego corre con --subir-revisadas.")


if __name__ == "__main__":
    main()
