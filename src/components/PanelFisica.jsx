import { useState } from 'react'
import { FISICA_INICIAL, NOMBRES, RANGOS } from '../lib/fisica'

// Herramienta de desarrollo: aparece solo con ?fisica en la dirección.
export default function PanelFisica({ fisica, onCambio }) {
  const [abierto, setAbierto] = useState(window.innerWidth > 900)
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(fisica, null, 2))
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1500)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <aside className="fixed bottom-[max(12px,env(safe-area-inset-bottom))] right-3 z-50 w-72 max-w-[calc(100vw-24px)] rounded-lg border border-champan bg-fondo/95 p-3 text-xs shadow-lg backdrop-blur">
      <div className="flex items-center justify-between">
        <strong className="font-medium">Física</strong>
        <button type="button" className="text-tinta-suave" onClick={() => setAbierto(!abierto)}>
          {abierto ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      {abierto && (
        <div className="mt-2 flex max-h-[55vh] flex-col gap-2 overflow-y-auto">
          {Object.keys(RANGOS).map((clave) => {
            const [min, max, paso, unidad] = RANGOS[clave]
            return (
              <label key={clave} className="flex flex-col gap-0.5" htmlFor={`f-${clave}`}>
                <span className="flex justify-between text-tinta-suave">
                  {NOMBRES[clave]}
                  <span className="tabular-nums text-tinta">
                    {fisica[clave]}
                    {unidad}
                  </span>
                </span>
                <input
                  id={`f-${clave}`}
                  type="range"
                  min={min}
                  max={max}
                  step={paso}
                  value={fisica[clave]}
                  onChange={(e) => onCambio({ ...fisica, [clave]: Number(e.target.value) })}
                  className="accent-[var(--oro-viejo)]"
                />
              </label>
            )
          })}
          <div className="mt-1 flex gap-2">
            <button type="button" onClick={copiar} className="flex-1 rounded-full bg-tinta py-1.5 text-fondo">
              {copiado ? 'Copiado' : 'Copiar valores'}
            </button>
            <button
              type="button"
              onClick={() => onCambio(FISICA_INICIAL)}
              className="flex-1 rounded-full border border-champan py-1.5"
            >
              Restablecer
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
