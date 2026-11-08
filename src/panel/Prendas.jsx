import { useEffect, useState } from 'react'
import { AnimatePresence, Reorder, motion, useDragControls } from 'motion/react'
import { Boton, useAvisos } from './ui'
import { formatoRef } from '../lib/formato'
import { usd } from '../lib/dinero'

const PESTANAS = [
  ['disponible', 'Disponibles'],
  ['vendida', 'Vendidas'],
  ['borrador', 'Borradores'],
  ['oculta', 'Ocultas'],
]

/** Lista de prendas: deslizar a la izquierda marca vendida, tocar abre el editor */
export default function Prendas({ api, prendas, onEditar, onCambio }) {
  const avisar = useAvisos()
  const [lista, setLista] = useState(prendas)
  const [pestana, setPestana] = useState('disponible')
  const [ordenando, setOrdenando] = useState(false)
  const [guardandoOrden, setGuardandoOrden] = useState(false)

  useEffect(() => setLista(prendas), [prendas])

  const cuenta = (e) => lista.filter((p) => p.estado_panel === e).length
  const visibles = lista.filter((p) => p.estado_panel === pestana)
  const pendientes = lista.filter((p) => p.fotoPendiente).length

  // Cambio inmediato en pantalla; si falla, se revierte
  async function cambiarEstado(prenda, cambios, nuevoEstado, mensaje, deshacer) {
    const anterior = lista
    setLista((l) => l.map((p) => (p.id === prenda.id ? { ...p, ...cambios, estado_panel: nuevoEstado } : p)))
    try {
      await api.cambiar(prenda.id, cambios)
      avisar(mensaje, deshacer ? { accion: 'Deshacer', alAccion: deshacer, duracion: 6000 } : undefined)
      onCambio()
    } catch (e) {
      setLista(anterior)
      avisar(e.message, { error: true })
    }
  }

  function marcarVendida(p) {
    cambiarEstado(p, { vendida_en: new Date().toISOString() }, 'vendida', `Ref ${formatoRef(p.ref)} marcada como vendida`, () =>
      cambiarEstado({ ...p }, { vendida_en: null }, 'disponible', 'Volvió a disponibles'),
    )
  }

  function volverADisponible(p) {
    cambiarEstado(p, { vendida_en: null }, 'disponible', `Ref ${formatoRef(p.ref)} está disponible otra vez`, () =>
      cambiarEstado({ ...p }, { vendida_en: p.vendida_en }, 'vendida', 'Marcada como vendida'),
    )
  }

  async function guardarOrden() {
    setGuardandoOrden(true)
    try {
      await api.ordenar(visibles.map((p) => p.id))
      avisar('Orden de la vitrina guardado')
      setOrdenando(false)
      onCambio()
    } catch (e) {
      avisar(e.message, { error: true })
    } finally {
      setGuardandoOrden(false)
    }
  }

  function reordenar(nuevos) {
    const otros = lista.filter((p) => p.estado_panel !== pestana)
    setLista([...nuevos, ...otros])
  }

  return (
    <div className="flex flex-col gap-4">
      <dl className="m-0 grid grid-cols-3 gap-2">
        {[
          ['Disponibles', cuenta('disponible')],
          ['Vendidas', cuenta('vendida')],
          ['Borradores', cuenta('borrador')],
        ].map(([t, n]) => (
          <div key={t} className="rounded-2xl bg-superficie px-3 py-2.5">
            <dt className="text-xs text-tinta-suave">{t}</dt>
            <dd className="m-0 text-2xl font-medium tabular-nums">{n}</dd>
          </div>
        ))}
      </dl>

      {pendientes > 0 && (
        <p className="m-0 rounded-2xl border border-dashed border-oro-viejo px-4 py-2.5 text-sm text-oro-viejo">
          {pendientes === 1 ? '1 foto espera' : `${pendientes} fotos esperan`} ser procesada{pendientes === 1 ? '' : 's'} por Rafael.
        </p>
      )}

      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist">
        {PESTANAS.filter(([e]) => e === 'disponible' || cuenta(e) > 0).map(([e, t]) => (
          <button
            key={e}
            type="button"
            role="tab"
            aria-selected={pestana === e}
            onClick={() => {
              setPestana(e)
              setOrdenando(false)
            }}
            className={`min-h-10 shrink-0 rounded-full px-4 text-sm ${
              pestana === e ? 'bg-tinta font-medium text-fondo' : 'border border-champan text-tinta-suave'
            }`}
          >
            {t} <span className="tabular-nums opacity-70">{cuenta(e)}</span>
          </button>
        ))}
      </div>

      {pestana === 'disponible' && visibles.length > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="m-0 text-xs text-tinta-suave">
            {ordenando
              ? 'Arrastra desde las rayitas. La primera abre la vitrina.'
              : 'Desliza una prenda a la izquierda para marcarla vendida.'}
          </p>
          {ordenando ? (
            <Boton variante="primario" className="min-h-10 shrink-0" onClick={guardarOrden} cargando={guardandoOrden}>
              Listo
            </Boton>
          ) : (
            <Boton className="min-h-10 shrink-0" onClick={() => setOrdenando(true)}>
              Ordenar
            </Boton>
          )}
        </div>
      )}

      {visibles.length === 0 ? (
        <Vacio pestana={pestana} />
      ) : ordenando ? (
        <Reorder.Group axis="y" values={visibles} onReorder={reordenar} className="m-0 flex list-none flex-col gap-2 p-0">
          {visibles.map((p) => (
            <FilaOrdenable key={p.id} prenda={p} />
          ))}
        </Reorder.Group>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          <AnimatePresence initial={false}>
            {visibles.map((p) => (
              <motion.li
                key={p.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
              >
                <FilaDeslizable
                  prenda={p}
                  accion={
                    pestana === 'disponible'
                      ? { texto: 'Vendida', alHacer: () => marcarVendida(p) }
                      : pestana === 'vendida'
                        ? { texto: 'Disponible', alHacer: () => volverADisponible(p) }
                        : null
                  }
                  onTocar={() => onEditar(p.id)}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}

function Miniatura({ prenda }) {
  return (
    <div
      className="relative h-[68px] w-[51px] shrink-0 overflow-hidden border border-champan bg-superficie"
      style={{ borderRadius: '999px 999px 6px 6px' }}
    >
      {prenda.foto && (
        <img
          src={prenda.foto}
          alt=""
          loading="lazy"
          className={`h-full w-full object-contain ${prenda.tieneFotoProcesada ? 'p-1' : 'object-cover'}`}
        />
      )}
    </div>
  )
}

function Datos({ prenda }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="m-0 truncate font-medium">{prenda.nombre}</p>
      <p className="m-0 text-xs tabular-nums text-tinta-suave">
        Ref {formatoRef(prenda.ref)} · Talla {prenda.talla}
      </p>
      {prenda.fotoPendiente && (
        <span className="mt-1 inline-block rounded-full bg-rubor px-2 py-0.5 text-[11px] text-rubor-tinta">
          Foto por procesar
        </span>
      )}
    </div>
  )
}

function FilaDeslizable({ prenda, accion, onTocar }) {
  const [arrastrando, setArrastrando] = useState(false)
  return (
    <div className="relative overflow-hidden rounded-2xl">
      {accion && (
        <div className="absolute inset-0 flex items-center justify-end bg-oro-viejo px-5 text-sm font-medium text-fondo">
          {accion.texto}
        </div>
      )}
      <motion.button
        type="button"
        className="relative flex w-full items-center gap-3 rounded-2xl border border-champan/60 bg-fondo px-3 py-2 text-left"
        drag={accion ? 'x' : false}
        dragDirectionLock
        dragConstraints={{ left: -130, right: 0 }}
        dragElastic={{ left: 0.15, right: 0 }}
        dragSnapToOrigin
        onDragStart={() => setArrastrando(true)}
        onDragEnd={(_, info) => {
          setTimeout(() => setArrastrando(false), 50)
          if (info.offset.x < -95) accion.alHacer()
        }}
        onClick={() => !arrastrando && onTocar()}
        aria-label={`Editar ${prenda.nombre}`}
      >
        <Miniatura prenda={prenda} />
        <Datos prenda={prenda} />
        <span className="shrink-0 text-base font-medium tabular-nums">{usd(prenda.precio_usd)}</span>
      </motion.button>
    </div>
  )
}

function FilaOrdenable({ prenda }) {
  const control = useDragControls()
  return (
    <Reorder.Item
      value={prenda}
      dragListener={false}
      dragControls={control}
      className="flex items-center gap-3 rounded-2xl border border-champan/60 bg-fondo px-3 py-2"
      whileDrag={{ scale: 1.03, boxShadow: '0 10px 24px rgba(0,0,0,0.15)' }}
    >
      <Miniatura prenda={prenda} />
      <Datos prenda={prenda} />
      <button
        type="button"
        className="grid h-11 w-11 shrink-0 touch-none place-items-center rounded-full text-tinta-suave"
        onPointerDown={(e) => control.start(e)}
        aria-label={`Mover ${prenda.nombre}`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M5 9h14M5 15h14" />
        </svg>
      </button>
    </Reorder.Item>
  )
}

function Vacio({ pestana }) {
  const textos = {
    disponible: 'No hay prendas disponibles. Toca Nueva para agregar una.',
    vendida: 'Todavía no hay ventas.',
    borrador: 'No hay borradores.',
    oculta: 'No hay prendas ocultas.',
  }
  return <p className="py-12 text-center text-sm text-tinta-suave">{textos[pestana]}</p>
}
