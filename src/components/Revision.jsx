import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Hoja from './Hoja'
import { SelloVendido } from './ArcoPrenda'
import { EnlaceWhatsApp } from './Ficha'
import { IconoCorazon, IconoPaso } from './Iconos'
import { aBolivares, bs, conDescuento, fechaCorta, mejorDescuento, usd } from '../lib/dinero'
import { armarMensaje, enlaceWhatsApp } from '../lib/whatsapp'
import { registrar } from '../lib/eventos'
import Reinicio from './Reinicio'

/**
 * Revisión de la selección: lo que le gustó y lo que pasó.
 * Un toque mueve una prenda de una lista a la otra; las vendidas quedan fuera del mensaje.
 */
export default function Revision({
  prendas,
  decisiones,
  ajustes,
  metodos,
  tasa,
  terminoFila,
  hayPendientes,
  onDecidir,
  onAbrir,
  hayRecorrido,
  onVolverAVerTodo,
  onEmpezarDeCero,
  onCerrar,
}) {
  const [pestana, setPestana] = useState('me_gusta')
  const gustan = prendas.filter((p) => decisiones[p.id] === 'me_gusta')
  const pasadas = prendas.filter((p) => decisiones[p.id] === 'paso')
  const lista = pestana === 'me_gusta' ? gustan : pasadas

  const enviables = gustan.filter((p) => !p.vendida)
  const vendidasElegidas = gustan.length - enviables.length
  const total = enviables.reduce((s, p) => s + Number(p.precio_usd), 0)
  const promo = mejorDescuento(metodos)
  const enlace =
    enviables.length > 0
      ? enlaceWhatsApp(ajustes.whatsapp, armarMensaje({ prendas: enviables, ajustes, metodos, tasa }))
      : null

  const pie =
    pestana === 'me_gusta' && enviables.length > 0 ? (
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4 tabular-nums">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-tinta-suave">
              {enviables.length} {enviables.length === 1 ? 'pieza' : 'piezas'}
            </span>
            <span className="text-xs text-tinta-suave">{textoEntrega(ajustes)}</span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xl font-medium">{usd(total)}</span>
            {promo && (
              <span className="text-sm text-oro-viejo">
                Con {promo.nombre}: {usd(conDescuento(total, promo.descuento_pct))}
              </span>
            )}
            {tasa?.tasa && (
              <span className="text-xs text-tinta-suave">
                {bs(aBolivares(total, tasa.tasa))} · BCV {fechaCorta(tasa.publicada_en)}
              </span>
            )}
          </div>
        </div>
        <EnlaceWhatsApp
          enlace={enlace}
          texto="Enviar mi selección por WhatsApp"
          onUsar={() => enviables.forEach((p) => registrar(p.id, 'whatsapp'))}
        />
      </div>
    ) : null

  return (
    <Hoja titulo="Tu selección" onCerrar={onCerrar} pie={pie}>
      <div className="flex flex-col gap-4">
        <div className="text-center">
          {terminoFila && <p className="m-0 font-firma text-5xl leading-none">Viste todo el closet</p>}
          <h2 className={`m-0 font-medium ${terminoFila ? 'mt-1 text-sm text-tinta-suave' : 'text-lg'}`}>Tu selección</h2>
        </div>

        <div className="grid grid-cols-2 rounded-full border border-champan p-1" role="tablist">
          {[
            ['me_gusta', `Me gustan (${gustan.length})`],
            ['paso', `Pasaste (${pasadas.length})`],
          ].map(([clave, texto]) => (
            <button
              key={clave}
              type="button"
              role="tab"
              aria-selected={pestana === clave}
              onClick={() => setPestana(clave)}
              className={`rounded-full py-2 text-sm transition-colors ${
                pestana === clave ? 'bg-tinta font-medium text-fondo' : 'text-tinta-suave'
              }`}
            >
              {texto}
            </button>
          ))}
        </div>

        {pestana === 'me_gusta' && vendidasElegidas > 0 && (
          <p className="m-0 rounded-lg bg-superficie px-3 py-2 text-xs text-tinta-suave">
            {vendidasElegidas === 1
              ? 'Una pieza que te gustó se vendió mientras mirabas; no va en el mensaje.'
              : `${vendidasElegidas} piezas que te gustaron se vendieron mientras mirabas; no van en el mensaje.`}
          </p>
        )}

        {lista.length === 0 ? (
          <Vacio pestana={pestana} />
        ) : (
          <ul className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-5 p-0">
            <AnimatePresence initial={false}>
              {lista.map((p) => (
                <motion.li
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                >
                  <MiniPrenda
                    prenda={p}
                    decision={decisiones[p.id]}
                    onAbrir={() => onAbrir(p)}
                    onMover={() => onDecidir(p.id, decisiones[p.id] === 'me_gusta' ? 'paso' : 'me_gusta')}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}

        <div className="flex flex-col items-center gap-2 pt-1">
          {hayPendientes && (
            <button type="button" onClick={onCerrar} className="text-sm text-tinta-suave underline underline-offset-4">
              Seguir mirando
            </button>
          )}
          {(hayRecorrido || gustan.length + pasadas.length > 0) && (
            <Reinicio
              gustan={enviables.length}
              mostrarVolver={hayRecorrido}
              onVolverAVerTodo={onVolverAVerTodo}
              onEmpezarDeCero={onEmpezarDeCero}
            />
          )}
        </div>
      </div>
    </Hoja>
  )
}

function MiniPrenda({ prenda, decision, onAbrir, onMover }) {
  const gusta = decision === 'me_gusta'
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <button
          type="button"
          onClick={onAbrir}
          className="block w-full overflow-hidden border border-champan bg-superficie p-0"
          style={{ aspectRatio: '3 / 4', borderRadius: '999px 999px 8px 8px' }}
          aria-label={`Ver ${prenda.nombre}`}
        >
          <img
            src={prenda.foto}
            alt=""
            className="h-full w-full object-contain p-[10%]"
            style={{ filter: 'drop-shadow(0 8px 10px var(--sombra-prenda))', opacity: prenda.vendida ? 0.55 : 1 }}
          />
          {prenda.vendida && (
            <span className="absolute inset-0 scale-75">
              <SelloVendido />
            </span>
          )}
        </button>
        {!prenda.vendida && (
          <motion.button
            type="button"
            onClick={onMover}
            whileTap={{ scale: 0.85 }}
            className={`absolute -bottom-2 -right-1 grid h-10 w-10 place-items-center rounded-full border shadow-md ${
              gusta ? 'border-champan bg-fondo text-tinta-suave' : 'border-rubor-tinta bg-rubor text-rubor-tinta'
            }`}
            aria-label={gusta ? `Pasar ${prenda.nombre}` : `Me gusta ${prenda.nombre}`}
            title={gusta ? 'Ya no la quiero' : 'Sí me gusta'}
          >
            {gusta ? <IconoPaso className="h-4 w-4" /> : <IconoCorazon className="h-4 w-4" />}
          </motion.button>
        )}
      </div>
      <div className="min-w-0 px-0.5">
        <p className="m-0 truncate text-sm font-medium">{prenda.nombre}</p>
        <p className="m-0 text-xs tabular-nums text-tinta-suave">
          Talla {prenda.talla} · {prenda.vendida ? 'Vendida' : usd(prenda.precio_usd)}
        </p>
      </div>
    </div>
  )
}

function Vacio({ pestana }) {
  return (
    <div className="flex flex-col items-center gap-1 py-10 text-center">
      <p className="m-0 font-medium">
        {pestana === 'me_gusta' ? 'Todavía no eliges ninguna prenda' : 'No has pasado ninguna prenda'}
      </p>
      <p className="m-0 text-sm text-tinta-suave">
        {pestana === 'me_gusta'
          ? 'Desliza a la derecha las que te gusten y aparecen aquí.'
          : 'Las que deslices a la izquierda aparecen aquí, por si cambias de opinión.'}
      </p>
    </div>
  )
}

function textoEntrega(ajustes) {
  if (ajustes.modo_entrega === 'gratis') return `Entrega gratis en ${ajustes.ciudad}`
  if (ajustes.modo_entrega === 'fijo') return `Entrega en ${ajustes.ciudad}: ${usd(ajustes.costo_entrega_fijo_usd)}`
  return `Entrega en ${ajustes.ciudad} según la zona`
}
