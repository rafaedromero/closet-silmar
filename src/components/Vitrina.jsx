import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { motion } from 'motion/react'
import Tarjeta from './Tarjeta'
import Tutorial from './Tutorial'
import { IconoCorazon, IconoPaso } from './Iconos'
import Reinicio from './Reinicio'
import { precargar } from '../lib/precarga'
import { registrar } from '../lib/eventos'

/**
 * La fila de prendas. Disponibles primero, vendidas al final con su sello.
 * Derecha = me gusta, izquierda = paso. La prenda actual es la primera sin decidir.
 */
const Vitrina = forwardRef(function Vitrina(
  { prendas, fisica, decisiones, recorrido, onDecidir, onTocar, onRevisar, onVolverAVerTodo, onEmpezarDeCero, mostrarTutorial = false, onFinTutorial, pausada = false },
  ref,
) {
  const fila = prendas // ya llega en el orden de la vitrina
  const pendientes = fila.filter((p) => !recorrido.has(p.id))
  const indice = fila.length - pendientes.length
  const tarjetas = useRef({})
  const ocupado = useRef(false)
  const actualRef = useRef(null)
  actualRef.current = pendientes[0] || null

  const alDecidir = useCallback(
    (prenda, tipo) => {
      ocupado.current = false
      onDecidir(prenda.id, tipo)
    },
    [onDecidir],
  )

  const tarjetaActual = useCallback(() => {
    const actual = actualRef.current
    return actual ? tarjetas.current[actual.id] : null
  }, [])

  const demostrar = useCallback((dx) => tarjetaActual()?.demostrar(dx), [tarjetaActual])

  const decidirConBoton = useCallback(
    (direccion) => {
      const tarjeta = tarjetaActual()
      if (ocupado.current || mostrarTutorial || !tarjeta) return
      ocupado.current = true
      tarjeta.lanzar(direccion)
    },
    [tarjetaActual, mostrarTutorial],
  )

  useImperativeHandle(ref, () => ({ decidir: decidirConBoton }), [decidirConBoton])

  useEffect(() => {
    if (pausada) return
    function tecla(e) {
      if (e.key === 'ArrowRight') decidirConBoton(1)
      if (e.key === 'ArrowLeft') decidirConBoton(-1)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [decidirConBoton, pausada])

  // Mientras mira una prenda, se descargan las siguientes
  const proximas = pendientes
    .slice(0, 6)
    .map((p) => p.foto)
    .join('|')
  useEffect(() => {
    precargar(proximas.split('|'))
  }, [proximas])

  // La prenda que llega al frente cuenta como vista
  const alFrente = pendientes[0]?.id
  useEffect(() => {
    if (alFrente && !mostrarTutorial) registrar(alFrente, 'vista')
  }, [alFrente, mostrarTutorial])

  const terminado = pendientes.length === 0
  const visibles = pendientes.slice(0, 3)

  return (
    <section className="flex w-full flex-1 flex-col items-center gap-5" aria-label="Vitrina de prendas">
      <div
        className="relative w-[min(86vw,400px,calc((100dvh-300px)*0.72))]"
        style={{ aspectRatio: '3 / 4.9' }}
      >
        {terminado ? (
          <FinDeFila
            onRevisar={onRevisar}
            gustan={prendas.filter((p) => decisiones[p.id] === 'me_gusta' && !p.vendida).length}
            onVolverAVerTodo={onVolverAVerTodo}
            onEmpezarDeCero={onEmpezarDeCero}
          />
        ) : (
          visibles
            .map((prenda, i) => (
              <Tarjeta
                key={prenda.id}
                ref={(t) => {
                  if (t) tarjetas.current[prenda.id] = t
                  else delete tarjetas.current[prenda.id]
                }}
                prenda={prenda}
                teGusta={decisiones[prenda.id] === 'me_gusta'}
                posicion={i}
                fisica={fisica}
                onDecision={alDecidir}
                onTocar={onTocar}
              />
            ))
            .reverse()
        )}
        {mostrarTutorial && !terminado && <Tutorial demostrar={demostrar} onTerminar={onFinTutorial} />}
      </div>

      {!terminado && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-6">
            <BotonRedondo etiqueta="Paso" onClick={() => decidirConBoton(-1)}>
              <IconoPaso />
            </BotonRedondo>
            <BotonRedondo etiqueta="Me gusta" acento onClick={() => decidirConBoton(1)}>
              <IconoCorazon />
            </BotonRedondo>
          </div>
          <p className="m-0 text-xs tabular-nums text-tinta-suave" aria-live="polite">
            {indice + 1} de {fila.length}
          </p>
        </div>
      )}
    </section>
  )
})

export default Vitrina

function BotonRedondo({ etiqueta, acento = false, onClick, children }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      title={etiqueta}
      whileTap={{ scale: 0.88 }}
      className={`grid h-14 w-14 place-items-center rounded-full border transition-colors ${
        acento
          ? 'border-rubor-tinta bg-rubor text-rubor-tinta'
          : 'border-champan bg-fondo text-tinta-suave hover:bg-superficie'
      }`}
    >
      {children}
    </motion.button>
  )
}

function FinDeFila({ onRevisar, gustan, onVolverAVerTodo, onEmpezarDeCero }) {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center gap-4 border border-champan bg-superficie px-8 text-center"
      style={{ borderRadius: '999px 999px 10px 10px' }}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
    >
      <p className="m-0 font-firma text-5xl leading-none">Viste todo el closet</p>
      <button
        type="button"
        onClick={onRevisar}
        className="rounded-full bg-tinta px-6 py-2.5 text-sm font-medium text-fondo"
      >
        Revisar mi selección
      </button>
      <Reinicio gustan={gustan} onVolverAVerTodo={onVolverAVerTodo} onEmpezarDeCero={onEmpezarDeCero} />
    </motion.div>
  )
}
