"""
Carga la plantilla datos/prendas.xlsx en Supabase: sube cada foto procesada
al almacenamiento y crea o actualiza su prenda.

Uso:
    python scripts/cargar_prendas.py --probar   # solo revisa la plantilla, no escribe nada
    python scripts/cargar_prendas.py            # revisa y carga

Se puede correr varias veces: si una foto ya estaba cargada, actualiza su prenda
en lugar de duplicarla. Nunca toca si una prenda está vendida.

Necesita un archivo scripts/.env.carga (no se sube al repositorio) con:
    SUPABASE_URL=https://xxxxxxxx.supabase.co
    SUPABASE_SECRET_KEY=la clave secreta (service_role o sb_secret_...)
Esa clave salta los permisos: úsala solo aquí, nunca en el catálogo.
"""

import json
import os
import sys
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from openpyxl import load_workbook

RAIZ = Path(__file__).resolve().parent.parent
PLANTILLA = RAIZ / "datos" / "prendas.xlsx"
FOTOS = RAIZ / "fotos" / "procesadas"
BUCKET = "prendas"
PRIMERA_FILA = 4  # 1: nota, 2: encabezados, 3: ejemplo

TIPOS = {"blusa", "camisa", "chaqueta", "vestido", "pantalon", "falda", "otro"}
TALLAS_LETRA = ["XS", "S", "M", "L", "XL", "XXL", "Única"]
TALLAS_NUMERO = [str(n) for n in range(0, 21, 2)]
ESTADOS = {
    "nueva con etiqueta": "nueva_con_etiqueta",
    "nueva sin etiqueta": "nueva_sin_etiqueta",
    "usada como nueva": "usada_como_nueva",
    "usada": "usada",
}
MEDIDAS = ["busto", "cintura", "cadera", "largo", "manga", "tiro"]


# ── utilidades ────────────────────────────────────────────────
def sin_acentos(texto):
    return "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn")


def texto(valor):
    if valor is None:
        return ""
    if isinstance(valor, float) and valor.is_integer():
        valor = int(valor)
    return " ".join(str(valor).split())  # quita espacios dobles y sobrantes


def numero(valor):
    if valor in (None, ""):
        return None
    if isinstance(valor, (int, float)):
        return float(valor)
    limpio = str(valor).replace("$", "").replace(" ", "").replace(",", ".")
    return float(limpio)


def normalizar_talla(valor, tipo):
    t = texto(valor)
    if sin_acentos(t).lower() == "unica":
        return "Única"
    return t.upper()


# ── lectura y validación ─────────────────────────────────────
def leer_plantilla():
    hoja = load_workbook(PLANTILLA, data_only=True)["Prendas"]
    encabezados = [texto(c.value) for c in hoja[2]]
    col = {nombre: i for i, nombre in enumerate(encabezados)}
    prendas, errores, omitidas = [], [], []

    for n_fila, fila in enumerate(hoja.iter_rows(min_row=PRIMERA_FILA, values_only=True), PRIMERA_FILA):
        v = lambda nombre: fila[col[nombre]] if col.get(nombre) is not None else None  # noqa: E731
        foto = texto(v("foto"))
        if not foto or foto.upper() == "EJEMPLO":
            continue
        num = texto(v("#")) or str(n_fila - PRIMERA_FILA + 1)
        etiqueta = f"Fila {n_fila} (#{num}, {foto})"
        nombre = texto(v("nombre"))
        if not nombre and not texto(v("precio_usd")):
            omitidas.append(etiqueta)
            continue

        problemas = []
        tipo = sin_acentos(texto(v("tipo"))).lower()
        if tipo not in TIPOS:
            problemas.append(f"tipo '{texto(v('tipo'))}' no es válido")
        talla = normalizar_talla(v("talla"), tipo)
        # Se respeta lo que dice la etiqueta: letras o números en cualquier prenda
        if tipo == "otro":
            if not talla:
                problemas.append("falta la talla")
        elif talla not in TALLAS_LETRA + TALLAS_NUMERO:
            problemas.append(f"talla '{talla}' no es válida: XS a XXL, Única, o un número par del 0 al 20")
        estado = ESTADOS.get(texto(v("estado")).lower())
        if not estado:
            problemas.append(f"estado '{texto(v('estado'))}' no es válido")
        if not nombre:
            problemas.append("falta el nombre")
        try:
            precio = numero(v("precio_usd"))
            original = numero(v("precio_original_usd"))
            if not precio or precio <= 0:
                problemas.append("falta el precio")
            elif original is not None and original <= precio:
                problemas.append("el precio original debe ser mayor que el precio de Silmar")
        except ValueError:
            problemas.append("un precio no es un número")
            precio = original = None
        medidas = {}
        for m in MEDIDAS:
            try:
                valor = numero(v(f"{m}_cm"))
            except ValueError:
                problemas.append(f"la medida {m} no es un número")
                continue
            if valor:
                medidas[m] = int(valor) if float(valor).is_integer() else valor
        if not (FOTOS / foto).exists():
            problemas.append(f"no encuentro la foto en {FOTOS.relative_to(RAIZ)}")

        if problemas:
            errores.append(f"{etiqueta}: " + "; ".join(problemas))
            continue

        prendas.append(
            {
                "foto": foto,
                "datos": {
                    "nombre": nombre,
                    "tipo": tipo,
                    "marca": texto(v("marca")) or None,
                    "talla": talla,
                    "color": texto(v("color")) or None,
                    "estado": estado,
                    "precio_usd": round(precio, 2),
                    "precio_original_usd": round(original, 2) if original else None,
                    "descripcion": texto(v("descripcion")) or None,
                    "medidas": medidas,
                    "orden": int(num) * 10 if num.isdigit() else n_fila * 10,
                    "publicada": sin_acentos(texto(v("publicar")) or "si").lower() != "no",
                },
            }
        )
    return prendas, errores, omitidas


# ── Supabase ─────────────────────────────────────────────────
class Supabase:
    def __init__(self, url, clave):
        self.url = url.rstrip("/").removesuffix("/rest/v1")
        self.base = {"apikey": clave}
        # Las claves nuevas (sb_secret_…) no son JWT: basta el encabezado apikey
        if not clave.startswith("sb_"):
            self.base["Authorization"] = f"Bearer {clave}"

    def _pedir(self, metodo, ruta, cuerpo=None, encabezados=None):
        datos = cuerpo
        h = {**self.base, **(encabezados or {})}
        if isinstance(cuerpo, (dict, list)):
            datos = json.dumps(cuerpo).encode()
            h["Content-Type"] = "application/json"
        pedido = urllib.request.Request(self.url + ruta, data=datos, method=metodo, headers=h)
        try:
            with urllib.request.urlopen(pedido, timeout=60) as r:
                contenido = r.read()
                return json.loads(contenido) if contenido else None
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"{metodo} {ruta} → {e.code}: {e.read().decode(errors='replace')}") from None

    def subir_foto(self, archivo):
        ruta = f"/storage/v1/object/{BUCKET}/{urllib.parse.quote(archivo.name)}"
        self._pedir("POST", ruta, archivo.read_bytes(), {"Content-Type": "image/webp", "x-upsert": "true", "cache-control": "3600"})
        return archivo.name

    def prenda_de_foto(self, ruta_foto):
        r = self._pedir("GET", f"/rest/v1/prenda_fotos?select=prenda_id&ruta=eq.{urllib.parse.quote(ruta_foto)}")
        return r[0]["prenda_id"] if r else None

    def crear_prenda(self, datos):
        r = self._pedir("POST", "/rest/v1/prendas", datos, {"Prefer": "return=representation"})
        return r[0]

    def actualizar_prenda(self, id_, datos):
        r = self._pedir("PATCH", f"/rest/v1/prendas?id=eq.{id_}", datos, {"Prefer": "return=representation"})
        return r[0]

    def crear_foto(self, prenda_id, ruta_foto):
        self._pedir("POST", "/rest/v1/prenda_fotos", {"prenda_id": prenda_id, "ruta": ruta_foto, "principal": True, "orden": 0})


def leer_config():
    archivo = Path(__file__).with_name(".env.carga")
    config = {}
    if archivo.exists():
        for linea in archivo.read_text(encoding="utf-8").splitlines():
            if "=" in linea and not linea.lstrip().startswith("#"):
                k, v = linea.split("=", 1)
                config[k.strip()] = v.strip()
    url = os.environ.get("SUPABASE_URL") or config.get("SUPABASE_URL")
    clave = os.environ.get("SUPABASE_SECRET_KEY") or config.get("SUPABASE_SECRET_KEY")
    if not url or not clave:
        sys.exit("Falta SUPABASE_URL o SUPABASE_SECRET_KEY en scripts/.env.carga")
    return url, clave


# ── principal ────────────────────────────────────────────────
def main():
    probar = "--probar" in sys.argv
    prendas, errores, omitidas = leer_plantilla()

    print(f"Plantilla: {len(prendas)} prendas listas, {len(errores)} con problemas, {len(omitidas)} sin llenar.")
    for e in errores:
        print("  ✗", e)
    for o in omitidas:
        print("  ·", o, "→ vacía, se omite")
    if errores:
        sys.exit("\nCorrige la plantilla y vuelve a correr. No se cargó nada.")
    if probar:
        for p in prendas:
            d = p["datos"]
            print(f"  ✓ #{d['orden'] // 10:02d} {d['nombre']} · {d['tipo']} · talla {d['talla']} · ${d['precio_usd']:g}"
                  + ("" if d["publicada"] else " · borrador"))
        print("\nModo prueba: no se escribió nada.")
        return

    sb = Supabase(*leer_config())
    creadas = actualizadas = 0
    for p in prendas:
        ruta = sb.subir_foto(FOTOS / p["foto"])
        existente = sb.prenda_de_foto(ruta)
        if existente:
            fila = sb.actualizar_prenda(existente, p["datos"])
            actualizadas += 1
            accion = "actualizada"
        else:
            fila = sb.crear_prenda(p["datos"])
            sb.crear_foto(fila["id"], ruta)
            creadas += 1
            accion = "creada"
        print(f"  ✓ Ref {fila['ref']:03d} {fila['nombre']} ({accion})")
    print(f"\nListo: {creadas} creadas, {actualizadas} actualizadas.")


if __name__ == "__main__":
    main()
