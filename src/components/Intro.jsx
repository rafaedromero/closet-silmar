import { useEffect } from 'react'
import { animate, motion, useMotionTemplate, useMotionValue, useTransform } from 'motion/react'
import { Gancho } from './ArcoPrenda'

/**
 * Entrada a la tienda: un arco como vitrina, el nombre que se escribe
 * con pluma, el subtítulo, las piezas disponibles y el botón Comenzar.
 * Quien vuelve ve la misma secuencia, pero rápida.
 */
// "El Closet de Silmar" → ["El Closet", "de Silmar"]
function partirTitulo(titulo) {
  const corte = titulo.lastIndexOf(' de ')
  return corte > 0 ? [titulo.slice(0, corte), titulo.slice(corte + 1)] : [titulo]
}

export default function Intro({ titulo = 'El Closet de Silmar', subtitulo = 'Ropa que te va a encantar', disponibles, rapida, onComenzar }) {
  const lineas = partirTitulo(titulo)
  const t = rapida ? 0.35 : 1 // escala de tiempos
  const linea1 = rapida ? 0.35 : 0.3
  const durLinea = 0.95 * t
  const linea2 = linea1 + durLinea * 0.85
  const finFirma = linea2 + durLinea

  return (
    <motion.section
      className="flex min-h-full w-full flex-1 flex-col items-center justify-center py-6"
      exit={{ opacity: 0, scale: 1.06, transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] } }}
      aria-label="Bienvenida"
    >
      <div className="relative w-[min(84vw,400px,calc((100dvh-80px)*0.66))]">
        <div
          className="relative flex flex-col items-center border border-champan bg-superficie/60"
          style={{ aspectRatio: '3 / 4.3', borderRadius: '999px 999px 10px 10px' }}
        >
          <motion.div
            className="absolute inset-x-0 top-[4%] flex justify-center"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 * t, delay: 0.05 }}
          >
            <div className="relative h-14 w-full">
              <Gancho />
            </div>
          </motion.div>

          <div className="flex flex-1 flex-col items-center justify-center gap-1 px-4 pt-[8%] text-center">
            <h1 className="m-0 flex flex-col items-center font-firma font-normal leading-[0.82] text-[clamp(64px,19vw,104px)]">
              {lineas.map((texto, i) => (
                <LineaFirma key={texto} texto={texto} inicio={i === 0 ? linea1 : linea2} duracion={durLinea} />
              ))}
              <span className="sr-only">{titulo}</span>
            </h1>

            <motion.p
              className="etiqueta m-0 mt-4 text-[11px] text-tinta-suave sm:text-xs"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 * t, delay: finFirma }}
            >
              {subtitulo}
            </motion.p>

            <motion.p
              className="m-0 mt-2 text-xs tabular-nums text-oro-viejo"
              initial={{ opacity: 0 }}
              animate={{ opacity: disponibles === null ? 0 : 1 }}
              transition={{ duration: 0.5 * t, delay: finFirma + 0.25 * t }}
              aria-hidden={disponibles === null}
            >
              {disponibles === null
                ? '\u00a0'
                : `${disponibles} ${disponibles === 1 ? 'pieza disponible' : 'piezas disponibles'}`}
            </motion.p>
          </div>

          <motion.div
            className="pb-[12%]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: finFirma + 0.5 * t }}
          >
            <motion.button
              type="button"
              onClick={onComenzar}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-full bg-tinta px-9 py-3 text-sm font-medium tracking-wide text-fondo"
            >
              Comenzar
            </motion.button>
          </motion.div>
        </div>
        <div className="acanalado mx-[4%] h-4 rounded-b-md" aria-hidden="true" />
      </div>
    </motion.section>
  )
}

/**
 * Una línea del nombre que se descubre de izquierda a derecha con borde suave,
 * como tinta detrás de la punta de la pluma, con un brillo champán en la punta.
 */
function LineaFirma({ texto, inicio, duracion }) {
  const avance = useMotionValue(-12)
  const borde = useTransform(avance, (v) => v + 12)
  const mascara = useMotionTemplate`linear-gradient(90deg, #000 ${avance}%, transparent ${borde}%)`
  const puntaX = useTransform(avance, (v) => `${Math.min(Math.max(v + 6, 0), 100)}%`)
  const puntaOpacidad = useTransform(avance, [-12, 0, 92, 104], [0, 1, 1, 0])

  useEffect(() => {
    const control = animate(avance, 104, {
      duration: duracion,
      delay: inicio,
      ease: [0.45, 0.05, 0.4, 1],
    })
    return () => control.stop()
  }, [avance, inicio, duracion])

  return (
    <span className="relative block px-[0.12em] pb-[0.08em]" aria-hidden="true">
      <motion.span className="block whitespace-nowrap" style={{ maskImage: mascara, WebkitMaskImage: mascara }}>
        {texto}
      </motion.span>
      <motion.span
        className="pointer-events-none absolute top-[18%] h-[60%] w-[0.5em] -translate-x-1/2 rounded-full"
        style={{
          left: puntaX,
          opacity: puntaOpacidad,
          background: 'radial-gradient(closest-side, color-mix(in srgb, var(--champan) 70%, transparent), transparent)',
          filter: 'blur(6px)',
        }}
      />
    </span>
  )
}
