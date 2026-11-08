import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue } from 'motion/react'

const PASOS = [
  { texto: 'Desliza a la derecha si te gusta', dx: 130 },
  { texto: 'A la izquierda si no es para ti', dx: -130 },
  { texto: 'Toca la prenda para ver sus detalles', dx: 0 },
]

const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Tutorial de primera vez, sobre la prenda real. Un dedo dibujado hace
 * cada gesto mientras la tarjeta se mueve de verdad.
 */
export default function Tutorial({ demostrar, onTerminar }) {
  const [paso, setPaso] = useState(0)
  const [listo, setListo] = useState(false)
  const [tocando, setTocando] = useState(false)
  const dedoX = useMotionValue(0)
  const activo = useRef(true)

  useEffect(() => {
    activo.current = true
    async function secuencia() {
      await esperar(350)
      for (let i = 0; i < PASOS.length && activo.current; i++) {
        setPaso(i)
        await esperar(380) // primero se lee el texto, luego el gesto
        if (!activo.current) return
        const { dx } = PASOS[i]
        if (dx !== 0) {
          animate(dedoX, dx, { duration: 0.7, ease: [0.3, 0, 0.2, 1] })
          const movimiento = demostrar(dx)
          await esperar(1000)
          if (!activo.current) return
          animate(dedoX, 0, { type: 'spring', stiffness: 300, damping: 24 })
          await movimiento
        } else {
          for (let t = 0; t < 2 && activo.current; t++) {
            setTocando(true)
            await esperar(260)
            setTocando(false)
            await esperar(420)
          }
        }
        await esperar(300)
      }
      if (activo.current) setListo(true)
    }
    secuencia()
    return () => {
      activo.current = false
    }
  }, [demostrar, dedoX])

  function terminar() {
    activo.current = false
    onTerminar?.()
  }

  return (
    <motion.div
      className="absolute inset-0 z-30"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-label="Cómo usar la vitrina"
    >
      {/* Dedo */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-[44%] -ml-6 -mt-6 h-12 w-12"
        style={{ x: dedoX }}
        animate={{ scale: tocando ? 0.82 : 1, opacity: listo ? 0 : 1 }}
        transition={{ duration: 0.18 }}
        aria-hidden="true"
      >
        <span className="absolute inset-0 rounded-full border-2 border-champan bg-tinta/25 backdrop-blur-[1px]" />
        <AnimatePresence>
          {tocando && (
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-champan"
              initial={{ scale: 1, opacity: 0.9 }}
              animate={{ scale: 2.1, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      <button
        type="button"
        onClick={terminar}
        className="absolute right-2 top-[14%] rounded-full bg-fondo/85 px-3 py-1 text-xs text-tinta-suave backdrop-blur"
      >
        Saltar
      </button>

      {/* Explicación */}
      <div className="absolute inset-x-0 bottom-[22%] flex flex-col items-center gap-3 px-4">
        <AnimatePresence mode="wait">
          <motion.p
            key={listo ? 'listo' : paso}
            className="m-0 rounded-full bg-tinta px-5 py-2.5 text-center text-sm text-fondo shadow-lg"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            aria-live="polite"
          >
            {listo ? 'Al final revisas todo lo que elegiste' : PASOS[paso].texto}
          </motion.p>
        </AnimatePresence>

        <div className="flex gap-1.5" aria-hidden="true">
          {PASOS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === paso || (listo && i === PASOS.length - 1) ? 'w-5 bg-oro-viejo' : 'w-1.5 bg-champan/50'
              }`}
            />
          ))}
        </div>

        <AnimatePresence>
          {listo && (
            <motion.button
              type="button"
              onClick={terminar}
              className="rounded-full border border-champan bg-fondo px-7 py-2.5 text-sm font-medium"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              Entendido
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
