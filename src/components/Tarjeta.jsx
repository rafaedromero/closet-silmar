import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import ArcoPrenda from './ArcoPrenda'
import { formatoRef } from '../lib/formato'
import { IconoCorazon } from './Iconos'

/**
 * Una prenda de la vitrina. Solo la de arriba se puede arrastrar.
 * Física tipo resortera: se estira con resistencia; si no alcanza el umbral
 * rebota a su lugar, y si lo pasa sale disparada con la velocidad del dedo.
 */
const Tarjeta = forwardRef(function Tarjeta(
  { prenda, posicion, fisica: F, onDecision, onTocar, teGusta = false },
  ref,
) {
  const esTope = posicion === 0
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const giro = useTransform(x, [-260, 0, 260], [-F.giroMaximo, 0, F.giroMaximo])
  const opMeGusta = useTransform(x, [15, F.umbralDistancia], [0, 1])
  const opPaso = useTransform(x, [-F.umbralDistancia, -15], [1, 0])
  // Si se vende mientras está a la vista, la tarjeta se sacude con el golpe del sello
  const [vendidaAlAparecer] = useState(prenda.vendida)
  useEffect(() => {
    if (!prenda.vendida || vendidaAlAparecer || posicion > 1) return
    const control = animate(x, [0, -14, 11, -7, 3, 0], { duration: 0.55, delay: 0.3, ease: 'easeOut' })
    return () => control.stop()
  }, [prenda.vendida, vendidaAlAparecer, posicion, x])

  // Datos del gesto actual, para no confundir un deslizamiento con un toque
  const gesto = useRef({ arrastro: false, lanzada: false, x0: 0, y0: 0, t0: 0 })

  function lanzar(direccion, velocidad = 0) {
    gesto.current.lanzada = true
    const destino = direccion * (window.innerWidth / 2 + 520)
    const opciones = {
      type: 'spring',
      stiffness: F.rigidezLanzamiento,
      damping: F.amortiguacionLanzamiento,
      velocity: velocidad || direccion * 900,
      restDelta: 40,
    }
    animate(y, y.get() + 40, opciones)
    return animate(x, destino, opciones).then(() =>
      onDecision(prenda, direccion > 0 ? 'me_gusta' : 'paso'),
    )
  }

  // Para el tutorial: lleva la tarjeta hacia un lado y la devuelve con rebote
  async function demostrar(dx, duracion = 0.7) {
    await animate(x, dx, { duration: duracion, ease: [0.3, 0, 0.2, 1] })
    await new Promise((r) => setTimeout(r, 450))
    await animate(x, 0, { type: 'spring', stiffness: F.rigidezRetorno, damping: F.amortiguacionRetorno })
  }

  useImperativeHandle(ref, () => ({ lanzar, demostrar }))

  function alPresionar(e) {
    gesto.current = { ...gesto.current, arrastro: false, x0: e.clientX, y0: e.clientY, t0: performance.now() }
  }

  // Un toque de verdad: sin arrastre, casi sin movimiento, breve y con la tarjeta en su lugar
  function alTocar(e) {
    const g = gesto.current
    const movimiento = Math.hypot(e.clientX - g.x0, e.clientY - g.y0)
    const duracion = performance.now() - g.t0
    if (g.arrastro || g.lanzada || movimiento > 8 || duracion > 450 || Math.abs(x.get()) > 4) return
    onTocar?.(prenda)
  }

  function alSoltar(_, info) {
    const { offset, velocity } = info
    const porDistancia = Math.abs(offset.x) > F.umbralDistancia
    const porVelocidad =
      Math.abs(velocity.x) > F.umbralVelocidad && Math.sign(velocity.x) === Math.sign(offset.x)
    if (porDistancia || porVelocidad) lanzar(Math.sign(offset.x) || 1, velocity.x)
  }

  // Las de atrás se asoman como perchas en fila
  const escala = 1 - posicion * 0.05
  const desplazamiento = posicion * 16

  return (
    <motion.div
      className="absolute inset-0 touch-none"
      style={{ x, y, rotate: giro, zIndex: 10 - posicion }}
      initial={false}
      animate={{ scale: escala, top: desplazamiento, opacity: posicion > 2 ? 0 : 1 }}
      transition={{ type: 'spring', stiffness: F.rigidezEntrada, damping: F.amortiguacionEntrada }}
      drag={esTope}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={F.elasticidad}
      dragTransition={{ bounceStiffness: F.rigidezRetorno, bounceDamping: F.amortiguacionRetorno }}
      whileDrag={{ cursor: 'grabbing' }}
      onPointerDown={esTope ? alPresionar : undefined}
      onDragStart={() => {
        gesto.current.arrastro = true
      }}
      onDragEnd={alSoltar}
      onTap={esTope ? alTocar : undefined}
      aria-hidden={!esTope}
    >
      <div className={`relative h-full ${esTope ? 'cursor-grab' : ''}`}>
        <ArcoPrenda foto={prenda.foto} alt={prenda.nombre} vendida={prenda.vendida} />
        {esTope && (
          <>
            <EtiquetaGesto texto="Me gusta" estilo={{ opacity: opMeGusta }} lado="izquierda" />
            <EtiquetaGesto texto="Paso" estilo={{ opacity: opPaso }} lado="derecha" />
          </>
        )}
        <div
          className="mt-3 flex items-baseline justify-between gap-3 px-1 transition-opacity duration-300"
          style={{ opacity: esTope ? 1 : 0 }}
        >
          <div className="min-w-0">
            <p className="m-0 truncate font-medium">{prenda.nombre}</p>
            {teGusta && !prenda.vendida && (
              <p className="m-0 flex items-center gap-1 text-xs text-rubor-tinta">
                <IconoCorazon className="h-3.5 w-3.5" relleno /> En tu selección
              </p>
            )}
            <p className="m-0 text-sm text-tinta-suave">
              {prenda.marca ? `${prenda.marca} · ` : ''}Talla {prenda.talla} · Ref {formatoRef(prenda.ref)}
            </p>
          </div>
          <div className="shrink-0 text-right tabular-nums">
            {prenda.precio_original_usd && !prenda.vendida && (
              <p className="m-0 text-xs text-tinta-suave line-through">${prenda.precio_original_usd}</p>
            )}
            {prenda.vendida ? (
              <p className="m-0 text-sm font-medium text-oro-viejo">Vendida</p>
            ) : (
              <p className="m-0 text-lg font-medium">${prenda.precio_usd}</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
})

// Sello que aparece mientras se arrastra, con el mismo lenguaje que VENDIDO
function EtiquetaGesto({ texto, estilo, lado }) {
  const esGusta = lado === 'izquierda'
  return (
    <motion.span
      className={`etiqueta pointer-events-none absolute top-[22%] rounded-sm border-2 px-3 py-1 text-base font-medium ${
        esGusta ? 'left-[8%] border-rubor-tinta text-rubor-tinta' : 'right-[8%] border-tinta-suave text-tinta-suave'
      }`}
      style={{
        ...estilo,
        rotate: esGusta ? -14 : 14,
        background: esGusta
          ? 'color-mix(in srgb, var(--rubor) 85%, transparent)'
          : 'color-mix(in srgb, var(--fondo) 85%, transparent)',
      }}
    >
      {texto}
    </motion.span>
  )
}

export default Tarjeta
