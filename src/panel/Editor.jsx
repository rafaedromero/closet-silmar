import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import ArcoPrenda from '../components/ArcoPrenda'
import { Boton, Campo, Chips, claseEntrada, useAvisos } from './ui'
import { ESTADOS } from '../lib/prenda'
import { formatoRef } from '../lib/formato'
import { usd } from '../lib/dinero'

const TIPOS = [
  ['blusa', 'Blusa'],
  ['camisa', 'Camisa'],
  ['chaqueta', 'Chaqueta'],
  ['vestido', 'Vestido'],
  ['pantalon', 'Pantalón'],
  ['falda', 'Falda'],
  ['otro', 'Otro'],
]
const TALLAS_LETRA = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Única']
const TALLAS_NUMERO = ['0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20']
const MEDIDAS = ['busto', 'cintura', 'cadera', 'largo', 'manga', 'tiro']
const NOMBRE_ESTADO = { disponible: 'Publicada', vendida: 'Vendida', borrador: 'Borrador', oculta: 'Oculta' }

function formularioDesde(p) {
  return {
    nombre: p?.nombre ?? '',
    tipo: p?.tipo ?? '',
    talla: p?.talla ?? '',
    estado: p?.estado ?? '',
    precio_usd: p?.precio_usd?.toString() ?? '',
    precio_original_usd: p?.precio_original_usd?.toString() ?? '',
    marca: p?.marca ?? '',
    color: p?.color ?? '',
    descripcion: p?.descripcion ?? '',
    medidas: Object.fromEntries(MEDIDAS.map((m) => [m, p?.medidas?.[m]?.toString() ?? ''])),
  }
}

const aNumero = (t) => (t.trim() === '' ? null : Number(t.replace(',', '.')))

function validar(f, hayFoto) {
  const errores = {}
  if (!f.nombre.trim()) errores.nombre = 'Escribe un nombre, por ejemplo "Blusa roja de gasa"'
  if (!f.tipo) errores.tipo = 'Elige el tipo'
  if (!f.talla) errores.talla = 'Elige la talla que dice la etiqueta'
  if (!f.estado) errores.estado = 'Elige el estado'
  const precio = aNumero(f.precio_usd)
  const original = aNumero(f.precio_original_usd)
  if (!precio || precio <= 0 || Number.isNaN(precio)) errores.precio_usd = 'Escribe el precio en dólares, solo el número'
  if (original !== null && (Number.isNaN(original) || original <= (precio || 0)))
    errores.precio_original_usd = 'Debe ser mayor que tu precio; si no lo sabes, déjalo vacío'
  if (!hayFoto) errores.foto = 'Agrega una foto de la prenda'
  return errores
}

/** Crear o editar una prenda, a pantalla completa */
export default function Editor({ api, prenda, onCerrar, onGuardado }) {
  const avisar = useAvisos()
  const nueva = !prenda
  const estado = prenda?.estado_panel ?? 'borrador'
  const [f, setF] = useState(() => formularioDesde(prenda))
  const [errores, setErrores] = useState({})
  const [archivo, setArchivo] = useState(null)
  const [vistaFoto, setVistaFoto] = useState(prenda?.foto ?? null)
  const [guardando, setGuardando] = useState(null)
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)
  const entradaFoto = useRef(null)

  useEffect(() => {
    if (!archivo) return
    const url = URL.createObjectURL(archivo)
    setVistaFoto(url)
    return () => URL.revokeObjectURL(url)
  }, [archivo])

  useEffect(() => {
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => (document.body.style.overflow = previo)
  }, [])

  const poner = (campo) => (valor) => {
    setF((x) => ({ ...x, [campo]: valor }))
    setErrores((e) => ({ ...e, [campo]: undefined }))
  }

  async function guardar({ publicar = false } = {}) {
    const errs = validar(f, Boolean(archivo || prenda?.foto))
    setErrores(errs)
    if (Object.keys(errs).length) {
      avisar('Revisa los campos marcados', { error: true })
      return
    }
    setGuardando(publicar ? 'publicar' : 'guardar')
    try {
      const medidas = Object.fromEntries(
        Object.entries(f.medidas)
          .map(([k, v]) => [k, aNumero(v)])
          .filter(([, v]) => v),
      )
      const datos = {
        nombre: f.nombre.trim().replace(/\s+/g, ' '),
        tipo: f.tipo,
        talla: f.talla,
        estado: f.estado,
        precio_usd: aNumero(f.precio_usd),
        precio_original_usd: aNumero(f.precio_original_usd),
        marca: f.marca.trim() || null,
        color: f.color.trim() || null,
        descripcion: f.descripcion.trim() || null,
        medidas,
      }
      const id = await api.guardarPrenda(prenda?.id, datos)
      if (archivo) await api.subirFoto(id, archivo, { tieneProcesada: Boolean(prenda?.tieneFotoProcesada) })
      if (publicar) await api.cambiar(id, { publicada: true })
      avisar(
        publicar
          ? 'Publicada en el catálogo'
          : archivo
            ? 'Guardada. Rafael procesará la foto para poder publicarla.'
            : 'Cambios guardados',
        { duracion: 5000 },
      )
      onCerrar()
      onGuardado()
    } catch (e) {
      avisar(e.message, { error: true })
    } finally {
      setGuardando(null)
    }
  }

  async function accionRapida(cambios, mensaje) {
    setGuardando('accion')
    try {
      await api.cambiar(prenda.id, cambios)
      avisar(mensaje)
      onCerrar()
      onGuardado()
    } catch (e) {
      avisar(e.message, { error: true })
    } finally {
      setGuardando(null)
    }
  }

  async function borrar() {
    setGuardando('accion')
    try {
      await api.borrar(prenda.id)
      avisar('Borrador eliminado')
      onCerrar()
      onGuardado()
    } catch (e) {
      avisar(e.message, { error: true })
    } finally {
      setGuardando(null)
    }
  }

  const fotoLista = prenda?.tieneFotoProcesada && !archivo
  const puedePublicar = estado === 'borrador' && fotoLista

  return (
    <motion.div
      className="fixed inset-0 z-40 flex flex-col bg-fondo"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 320, damping: 34 }}
      role="dialog"
      aria-modal="true"
      aria-label={nueva ? 'Nueva prenda' : `Editar ${prenda.nombre}`}
    >
      <header className="flex items-center gap-3 border-b border-champan/40 px-[max(16px,env(safe-area-inset-left))] pb-3 pt-[calc(12px+env(safe-area-inset-top,0px))]">
        <button
          type="button"
          onClick={onCerrar}
          className="grid h-11 w-11 place-items-center rounded-full text-tinta-suave"
          aria-label="Cerrar sin guardar"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-base font-medium">{nueva ? 'Nueva prenda' : prenda.nombre}</p>
          {!nueva && (
            <p className="m-0 text-xs text-tinta-suave">
              Ref {formatoRef(prenda.ref)} · {NOMBRE_ESTADO[estado]}
            </p>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain px-[max(16px,env(safe-area-inset-left))] pb-8 pt-5">
        <div className="mx-auto flex max-w-md flex-col gap-6">
          {/* Foto */}
          <section className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => entradaFoto.current?.click()}
              className={`relative w-48 overflow-hidden border bg-superficie ${errores.foto ? 'border-[#b4534d]' : 'border-champan'}`}
              style={{ aspectRatio: '3 / 4', borderRadius: '999px 999px 10px 10px' }}
              aria-label={vistaFoto ? 'Cambiar la foto' : 'Agregar foto'}
            >
              {vistaFoto ? (
                <img
                  src={vistaFoto}
                  alt=""
                  className={`h-full w-full ${fotoLista ? 'object-contain p-3' : 'object-cover'}`}
                />
              ) : (
                <span className="flex h-full flex-col items-center justify-center gap-2 px-4 text-sm text-tinta-suave">
                  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
                    <circle cx="12" cy="13" r="3.5" />
                  </svg>
                  Tomar o elegir foto
                </span>
              )}
            </button>
            <input
              ref={entradaFoto}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const a = e.target.files?.[0]
                if (a) {
                  setArchivo(a)
                  setErrores((x) => ({ ...x, foto: undefined }))
                }
              }}
            />
            {errores.foto ? (
              <p className="m-0 text-xs text-[#b4534d]">{errores.foto}</p>
            ) : archivo || prenda?.fotoPendiente ? (
              <p className="m-0 max-w-xs text-center text-xs text-oro-viejo">
                Foto por procesar: Rafael le quitará el fondo y el gancho. Mientras tanto la prenda no se puede publicar
                {prenda?.tieneFotoProcesada ? ' con la foto nueva; se sigue viendo la anterior' : ''}.
              </p>
            ) : (
              vistaFoto && (
                <Boton variante="fantasma" className="min-h-0" onClick={() => entradaFoto.current?.click()}>
                  Cambiar la foto
                </Boton>
              )
            )}
          </section>

          <Campo etiqueta="Nombre" htmlFor="nombre" error={errores.nombre}>
            <input id="nombre" className={claseEntrada} value={f.nombre} onChange={(e) => poner('nombre')(e.target.value)} placeholder="Blusa roja de gasa" />
          </Campo>

          <Campo etiqueta="Tipo" error={errores.tipo}>
            <Chips nombre="Tipo" opciones={TIPOS} valor={f.tipo} onCambio={poner('tipo')} />
          </Campo>

          <Campo etiqueta="Talla" ayuda="La que dice la etiqueta" error={errores.talla}>
            <div className="flex flex-col gap-2">
              <Chips nombre="Talla en letras" opciones={TALLAS_LETRA} valor={f.talla} onCambio={poner('talla')} />
              <Chips nombre="Talla en números" opciones={TALLAS_NUMERO} valor={f.talla} onCambio={poner('talla')} />
            </div>
          </Campo>

          <Campo etiqueta="Estado" error={errores.estado}>
            <Chips nombre="Estado" opciones={Object.entries(ESTADOS)} valor={f.estado} onCambio={poner('estado')} />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Tu precio ($)" htmlFor="precio" error={errores.precio_usd}>
              <input id="precio" inputMode="decimal" className={`${claseEntrada} tabular-nums`} value={f.precio_usd} onChange={(e) => poner('precio_usd')(e.target.value)} placeholder="18" />
            </Campo>
            <Campo etiqueta="Precio en tienda ($)" htmlFor="original" ayuda="Opcional, sale tachado" error={errores.precio_original_usd}>
              <input id="original" inputMode="decimal" className={`${claseEntrada} tabular-nums`} value={f.precio_original_usd} onChange={(e) => poner('precio_original_usd')(e.target.value)} placeholder="45" />
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Marca" htmlFor="marca" ayuda="Opcional">
              <input id="marca" className={claseEntrada} value={f.marca} onChange={(e) => poner('marca')(e.target.value)} placeholder="Express" />
            </Campo>
            <Campo etiqueta="Color" htmlFor="color" ayuda="Opcional">
              <input id="color" className={claseEntrada} value={f.color} onChange={(e) => poner('color')(e.target.value)} placeholder="Vino" />
            </Campo>
          </div>

          <Campo etiqueta="Descripción" htmlFor="descripcion" ayuda="Opcional: tela, detalles, cómo queda">
            <textarea id="descripcion" rows={3} className={`${claseEntrada} py-3`} value={f.descripcion} onChange={(e) => poner('descripcion')(e.target.value)} />
          </Campo>

          <details className="rounded-2xl border border-champan/60 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium">Medidas en cm (opcional)</summary>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {MEDIDAS.map((m) => (
                <label key={m} className="flex flex-col gap-1 text-xs capitalize text-tinta-suave" htmlFor={`m-${m}`}>
                  {m}
                  <input
                    id={`m-${m}`}
                    inputMode="decimal"
                    className={`${claseEntrada} min-h-11 px-3 tabular-nums`}
                    value={f.medidas[m]}
                    onChange={(e) => setF((x) => ({ ...x, medidas: { ...x.medidas, [m]: e.target.value } }))}
                  />
                </label>
              ))}
            </div>
          </details>

          {fotoLista && (
            <section className="flex flex-col items-center gap-2">
              <p className="etiqueta m-0 text-[11px] text-tinta-suave">Así se ve en el catálogo</p>
              <div className="w-52">
                <ArcoPrenda foto={prenda.foto} alt="" vendida={estado === 'vendida'} />
                <div className="mt-2 flex items-baseline justify-between gap-2 px-1">
                  <p className="m-0 truncate text-sm font-medium">{f.nombre || 'Sin nombre'}</p>
                  <p className="m-0 text-sm font-medium tabular-nums">{aNumero(f.precio_usd) ? usd(aNumero(f.precio_usd)) : ''}</p>
                </div>
              </div>
            </section>
          )}

          {/* Acciones secundarias */}
          {!nueva && (
            <section className="flex flex-col items-center gap-2 border-t border-champan/40 pt-5">
              {estado === 'disponible' && (
                <>
                  <Boton className="w-full" cargando={guardando === 'accion'} onClick={() => accionRapida({ vendida_en: new Date().toISOString() }, 'Marcada como vendida')}>
                    Marcar como vendida
                  </Boton>
                  <Boton variante="fantasma" onClick={() => accionRapida({ publicada: false }, 'Oculta del catálogo')}>
                    Ocultar del catálogo
                  </Boton>
                </>
              )}
              {estado === 'vendida' && (
                <Boton className="w-full" cargando={guardando === 'accion'} onClick={() => accionRapida({ vendida_en: null }, 'Disponible otra vez')}>
                  Volver a disponible
                </Boton>
              )}
              {estado === 'oculta' && (
                <Boton className="w-full" cargando={guardando === 'accion'} onClick={() => accionRapida({ publicada: true }, 'Visible en el catálogo')}>
                  Mostrar en el catálogo
                </Boton>
              )}
              {estado === 'borrador' &&
                (confirmarBorrado ? (
                  <div className="flex w-full flex-col items-center gap-2 rounded-2xl bg-superficie p-4 text-center">
                    <p className="m-0 text-sm">¿Borrar este borrador? No se puede deshacer.</p>
                    <div className="flex gap-2">
                      <Boton onClick={() => setConfirmarBorrado(false)}>Cancelar</Boton>
                      <Boton variante="peligro" cargando={guardando === 'accion'} textoCargando="Borrando…" onClick={borrar}>
                        Sí, borrar
                      </Boton>
                    </div>
                  </div>
                ) : (
                  <Boton variante="fantasma" onClick={() => setConfirmarBorrado(true)}>
                    Borrar borrador
                  </Boton>
                ))}
            </section>
          )}
        </div>
      </div>

      <footer className="flex gap-3 border-t border-champan/40 bg-fondo px-[max(16px,env(safe-area-inset-left))] pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
        {estado === 'borrador' ? (
          <>
            <Boton className="flex-1" cargando={guardando === 'guardar'} onClick={() => guardar()}>
              Guardar borrador
            </Boton>
            {puedePublicar && (
              <Boton variante="primario" className="flex-1" cargando={guardando === 'publicar'} textoCargando="Publicando…" onClick={() => guardar({ publicar: true })}>
                Publicar
              </Boton>
            )}
          </>
        ) : (
          <Boton variante="primario" className="flex-1" cargando={guardando === 'guardar'} onClick={() => guardar()}>
            Guardar cambios
          </Boton>
        )}
      </footer>
    </motion.div>
  )
}
