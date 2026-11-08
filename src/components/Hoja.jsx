import { useEffect } from 'react'
import { motion } from 'motion/react'
import { IconoCerrar } from './Iconos'

/** Hoja que sube desde abajo, sobre la vitrina. Se cierra con la X, tocando fuera o con Escape. */
export default function Hoja({ titulo, onCerrar, children, pie }) {
  useEffect(() => {
    const tecla = (e) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', tecla)
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', tecla)
      document.body.style.overflow = previo
    }
  }, [onCerrar])

  return (
    <motion.div className="fixed inset-0 z-40 flex items-end justify-center" initial="oculta" animate="visible" exit="oculta">
      <motion.button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 cursor-default bg-[rgb(20_14_10/0.5)]"
        variants={{ oculta: { opacity: 0 }, visible: { opacity: 1 } }}
        transition={{ duration: 0.25 }}
        onClick={onCerrar}
        tabIndex={-1}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="relative flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border-t border-champan bg-fondo"
        variants={{ oculta: { y: '100%' }, visible: { y: 0 } }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
      >
        <div className="flex items-center justify-between gap-3 px-[max(20px,env(safe-area-inset-left))] pb-2 pt-4">
          <span className="mx-auto h-1 w-10 rounded-full bg-champan/60" aria-hidden="true" />
          <button
            type="button"
            onClick={onCerrar}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-tinta-suave hover:bg-superficie"
            aria-label="Cerrar"
          >
            <IconoCerrar />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-[max(20px,env(safe-area-inset-left))] pb-6">
          {children}
        </div>
        {pie && (
          <div className="border-t border-champan/40 bg-fondo px-[max(20px,env(safe-area-inset-left))] pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
            {pie}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
