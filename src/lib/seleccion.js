import { useCallback, useEffect, useMemo, useState } from 'react'
import { guardar, leer } from './memoria'

function leerJSON(clave, porDefecto) {
  try {
    return JSON.parse(leer(clave)) ?? porDefecto
  } catch {
    return porDefecto
  }
}

/**
 * Dos cosas distintas que viven en el teléfono de la clienta:
 * - la selección: lo que eligió, { [idPrenda]: 'me_gusta' | 'paso' | 'visto' }
 * - el recorrido: las prendas que ya deslizó en esta vuelta por la vitrina
 * Así puede volver a ver todo sin perder lo que le gustó.
 */
export function useSeleccion() {
  const [decisiones, setDecisiones] = useState(() => leerJSON('seleccion', {}))
  const [recorridas, setRecorridas] = useState(() => {
    const guardado = leerJSON('recorrido', null)
    // Quien ya usaba el catálogo antes de este cambio sigue por donde iba
    return Array.isArray(guardado) ? guardado : Object.keys(leerJSON('seleccion', {}))
  })

  useEffect(() => guardar('seleccion', JSON.stringify(decisiones)), [decisiones])
  useEffect(() => guardar('recorrido', JSON.stringify(recorridas)), [recorridas])

  const recorrido = useMemo(() => new Set(recorridas), [recorridas])

  const decidir = useCallback((id, tipo) => setDecisiones((d) => ({ ...d, [id]: tipo })), [])
  const recorrer = useCallback((id) => setRecorridas((r) => (r.includes(id) ? r : [...r, id])), [])

  // Vuelve a la primera prenda; lo que eligió se mantiene y se actualiza si cambia de opinión
  const volverAVerTodo = useCallback(() => setRecorridas([]), [])

  // Como la primera vez: sin selección y desde la primera prenda
  const empezarDeCero = useCallback(() => {
    setRecorridas([])
    setDecisiones({})
  }, [])

  return { decisiones, recorrido, decidir, recorrer, volverAVerTodo, empezarDeCero }
}
