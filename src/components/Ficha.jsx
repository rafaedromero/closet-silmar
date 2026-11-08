import { useState } from 'react'
import { motion } from 'motion/react'
import Hoja from './Hoja'
import Precios from './Precios'
import { SelloVendido } from './ArcoPrenda'
import { IconoCorazon, IconoPaso, IconoWhatsApp } from './Iconos'
import { ESTADOS, listaMedidas } from '../lib/prenda'
import { formatoRef } from '../lib/formato'
import { armarMensaje, enlaceWhatsApp } from '../lib/whatsapp'
import { registrar } from '../lib/eventos'

/** Detalle de una prenda: foto ampliable, datos, precios y acciones */
export default function Ficha({ prenda, decision, ajustes, metodos, tasa, onDecidir, onCerrar }) {
  const medidas = listaMedidas(prenda.medidas)
  const enlace = enlaceWhatsApp(
    ajustes.whatsapp,
    armarMensaje({ prendas: [prenda], ajustes, metodos, tasa }),
  )

  const pie = prenda.vendida ? (
    <p className="m-0 py-2 text-center text-sm text-tinta-suave">Esta pieza ya tiene dueña.</p>
  ) : (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <BotonDecision activo={decision === 'paso'} onClick={() => onDecidir('paso')} etiqueta="Paso">
          <IconoPaso className="h-5 w-5" />
        </BotonDecision>
        <BotonDecision activo={decision === 'me_gusta'} acento onClick={() => onDecidir('me_gusta')} etiqueta="Me gusta">
          <IconoCorazon className="h-5 w-5" relleno={decision === 'me_gusta'} />
        </BotonDecision>
      </div>
      <EnlaceWhatsApp enlace={enlace} texto="Preguntar por esta pieza" onUsar={() => registrar(prenda.id, 'whatsapp')} />
    </div>
  )

  return (
    <Hoja titulo={prenda.nombre} onCerrar={onCerrar} pie={pie}>
      <div className="flex flex-col gap-5">
        <FotoAmpliable prenda={prenda} />

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-rubor px-3 py-0.5 text-xs font-medium text-rubor-tinta">
              {ESTADOS[prenda.estado]}
            </span>
            <span className="text-xs tabular-nums text-tinta-suave">Ref {formatoRef(prenda.ref)}</span>
          </div>
          <h2 className="m-0 text-xl font-medium leading-snug [text-wrap:balance]">{prenda.nombre}</h2>
          <p className="m-0 text-sm text-tinta-suave">
            {[prenda.marca, `Talla ${prenda.talla}`, prenda.color].filter(Boolean).join(' · ')}
          </p>
        </div>

        <Precios monto={prenda.precio_usd} original={prenda.precio_original_usd} metodos={metodos} tasa={tasa} grande />

        {prenda.descripcion && <p className="m-0 max-w-prose text-sm leading-relaxed">{prenda.descripcion}</p>}

        {medidas.length > 0 && (
          <div>
            <p className="etiqueta m-0 mb-2 text-[11px] text-tinta-suave">Medidas de la prenda</p>
            <dl className="m-0 grid grid-cols-3 gap-2">
              {medidas.map((m) => (
                <div key={m.nombre} className="rounded-lg bg-superficie px-3 py-2">
                  <dt className="text-xs text-tinta-suave">{m.nombre}</dt>
                  <dd className="m-0 text-sm font-medium tabular-nums">{m.valor}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </Hoja>
  )
}

function FotoAmpliable({ prenda }) {
  const [zoom, setZoom] = useState(false)
  const [origen, setOrigen] = useState('50% 50%')

  function punto(e) {
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 100
    const y = ((e.clientY - r.top) / r.height) * 100
    return `${Math.min(Math.max(x, 0), 100)}% ${Math.min(Math.max(y, 0), 100)}%`
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative w-[min(100%,340px)] touch-none overflow-hidden border border-champan bg-superficie"
        style={{ aspectRatio: '3 / 4', borderRadius: '999px 999px 10px 10px', cursor: zoom ? 'zoom-out' : 'zoom-in' }}
        onPointerDown={(e) => {
          setOrigen(punto(e))
          setZoom((z) => !z)
        }}
        onPointerMove={(e) => zoom && setOrigen(punto(e))}
        role="button"
        tabIndex={0}
        aria-label={zoom ? 'Alejar la foto' : 'Acercar la foto'}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setZoom((z) => !z)}
      >
        <motion.img
          src={prenda.foto}
          alt={prenda.nombre}
          draggable={false}
          className="absolute inset-[6%] h-[88%] w-[88%] select-none object-contain"
          style={{ transformOrigin: origen, filter: 'drop-shadow(0 12px 14px var(--sombra-prenda))' }}
          animate={{ scale: zoom ? 2.3 : 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        />
        {prenda.vendida && <SelloVendido />}
      </div>
      <p className="m-0 text-xs text-tinta-suave">
        {zoom ? 'Mueve el dedo para recorrer la tela' : 'Toca la foto para acercar'}
      </p>
    </div>
  )
}

function BotonDecision({ etiqueta, activo, acento = false, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`flex items-center justify-center gap-2 rounded-full border py-2.5 text-sm font-medium transition-colors ${
        activo
          ? acento
            ? 'border-rubor-tinta bg-rubor text-rubor-tinta'
            : 'border-tinta bg-tinta text-fondo'
          : 'border-champan text-tinta hover:bg-superficie'
      }`}
    >
      {children}
      {etiqueta}
    </button>
  )
}

export function EnlaceWhatsApp({ enlace, texto, onUsar }) {
  if (!enlace) {
    return (
      <p className="m-0 rounded-full border border-dashed border-champan py-2.5 text-center text-sm text-tinta-suave">
        El WhatsApp de la tienda aún no está configurado
      </p>
    )
  }
  return (
    <a
      href={enlace}
      onClick={onUsar}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 rounded-full bg-tinta py-3 text-sm font-medium text-fondo no-underline"
    >
      <IconoWhatsApp />
      {texto}
    </a>
  )
}
