import { useCallback, useEffect, useState } from 'react'
import { guardar, leer } from './memoria'

// Lo que la clienta eligió: { [idPrenda]: 'me_gusta' | 'paso' }.
// Vive en su teléfono, así que si cierra y vuelve, la encuentra igual.
export function useSeleccion() {
  const [decisiones, setDecisiones] = useState(() => {
    try {
      return JSON.parse(leer('seleccion') || '{}')
    } catch {
      return {}
    }
  })

  useEffect(() => {
    guardar('seleccion', JSON.stringify(decisiones))
  }, [decisiones])

  const decidir = useCallback((id, tipo) => setDecisiones((d) => ({ ...d, [id]: tipo })), [])
  const olvidar = useCallback(
    (tipo) => setDecisiones((d) => Object.fromEntries(Object.entries(d).filter(([, t]) => t !== tipo))),
    [],
  )

  return { decisiones, decidir, olvidar }
}
