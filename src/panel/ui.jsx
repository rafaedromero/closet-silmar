import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

// Piezas compartidas del panel: botones grandes, chips, campos y avisos

export function Boton({ variante = 'secundario', className = '', cargando = false, textoCargando = 'Guardando…', children, ...props }) {
  const estilos = {
    primario: 'bg-tinta text-fondo',
    secundario: 'border border-champan text-tinta bg-fondo',
    acento: 'bg-rubor text-rubor-tinta border border-rubor-tinta',
    peligro: 'border border-[#b4534d] text-[#b4534d] bg-fondo',
    fantasma: 'text-tinta-suave underline underline-offset-4',
  }
  return (
    <button
      type="button"
      {...props}
      disabled={cargando || props.disabled}
      className={`min-h-12 rounded-full px-5 text-sm font-medium transition-opacity disabled:opacity-50 ${estilos[variante]} ${className}`}
    >
      {cargando ? textoCargando : children}
    </button>
  )
}

export function Chips({ opciones, valor, onCambio, nombre }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={nombre}>
      {opciones.map((o) => {
        const [v, texto] = Array.isArray(o) ? o : [o, o]
        const activo = valor === v
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => onCambio(v)}
            className={`min-h-10 min-w-11 rounded-full border px-4 text-sm transition-colors ${
              activo ? 'border-tinta bg-tinta font-medium text-fondo' : 'border-champan text-tinta'
            }`}
          >
            {texto}
          </button>
        )
      })}
    </div>
  )
}

export function Campo({ etiqueta, ayuda, error, htmlFor, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {etiqueta}
      </label>
      {children}
      {error ? (
        <p className="m-0 text-xs text-[#b4534d]">{error}</p>
      ) : (
        ayuda && <p className="m-0 text-xs text-tinta-suave">{ayuda}</p>
      )}
    </div>
  )
}

export const claseEntrada =
  'min-h-12 w-full rounded-xl border border-champan bg-fondo px-4 text-base text-tinta placeholder:text-tinta-suave/60 focus:border-tinta'

export function Interruptor({ activo, onCambio, etiqueta, id }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      onClick={() => onCambio(!activo)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${activo ? 'bg-tinta' : 'bg-superficie-2'}`}
    >
      <motion.span
        className="absolute top-1 h-5 w-5 rounded-full bg-fondo shadow"
        animate={{ left: activo ? 24 : 4 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      />
    </button>
  )
}

// ── Avisos (toasts) con acción opcional, por ejemplo "Deshacer" ──
const ContextoAvisos = createContext(() => {})

export function ProveedorAvisos({ children }) {
  const [aviso, setAviso] = useState(null)
  const temporizador = useRef(null)

  const avisar = useCallback((texto, { accion, alAccion, error = false, duracion = 4000 } = {}) => {
    clearTimeout(temporizador.current)
    setAviso({ id: Date.now(), texto, accion, alAccion, error })
    temporizador.current = setTimeout(() => setAviso(null), duracion)
  }, [])

  return (
    <ContextoAvisos.Provider value={avisar}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom,0px))] z-50 flex justify-center px-4">
        <AnimatePresence>
          {aviso && (
            <motion.div
              key={aviso.id}
              role="status"
              className={`pointer-events-auto flex min-h-12 max-w-md items-center gap-4 rounded-full px-5 py-2 text-sm shadow-lg ${
                aviso.error ? 'bg-[#b4534d] text-white' : 'bg-tinta text-fondo'
              }`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              <span>{aviso.texto}</span>
              {aviso.accion && (
                <button
                  type="button"
                  className="font-medium text-champan"
                  onClick={() => {
                    aviso.alAccion?.()
                    setAviso(null)
                  }}
                >
                  {aviso.accion}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ContextoAvisos.Provider>
  )
}

export const useAvisos = () => useContext(ContextoAvisos)
