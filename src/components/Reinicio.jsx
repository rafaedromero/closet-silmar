import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

/**
 * "Volver a ver todo" (conserva los me gusta) y "Empezar de cero" (borra la selección).
 * Empezar de cero pide confirmar en la misma pantalla cuando hay algo que perder.
 */
export default function Reinicio({ gustan, onVolverAVerTodo, onEmpezarDeCero, mostrarVolver = true }) {
  const [confirmando, setConfirmando] = useState(false)

  function empezar() {
    if (gustan > 0 && !confirmando) return setConfirmando(true)
    setConfirmando(false)
    onEmpezarDeCero()
  }

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <AnimatePresence mode="wait" initial={false}>
        {confirmando ? (
          <motion.div
            key="confirmar"
            className="flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl bg-fondo/80 px-4 py-3 text-center"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            role="alertdialog"
            aria-label="Confirmar empezar de cero"
          >
            <p className="m-0 text-sm">
              Se borrará tu selección de {gustan} {gustan === 1 ? 'prenda' : 'prendas'}.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                className="rounded-full border border-champan px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={empezar}
                className="rounded-full bg-tinta px-4 py-2 text-sm font-medium text-fondo"
              >
                Sí, empezar de cero
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="acciones"
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {mostrarVolver && (
              <button
                type="button"
                onClick={onVolverAVerTodo}
                className="text-sm text-tinta-suave underline underline-offset-4"
              >
                Volver a ver todo
              </button>
            )}
            <button type="button" onClick={empezar} className="text-sm text-tinta-suave underline underline-offset-4">
              Empezar de cero
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
