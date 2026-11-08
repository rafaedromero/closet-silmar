import { useRef } from 'react'

/**
 * Orden de la vitrina: disponibles primero y vendidas al final, pero fijado
 * la primera vez que se ve cada prenda. Si una se vende mientras la clienta
 * mira, recibe su sello en el lugar donde está, sin saltar al final de la fila.
 */
export function useFilaEstable(prendas) {
  const posiciones = useRef(new Map())
  const mapa = posiciones.current
  const nuevas = [...prendas.filter((p) => !p.vendida), ...prendas.filter((p) => p.vendida)].filter(
    (p) => !mapa.has(p.id),
  )
  for (const p of nuevas) mapa.set(p.id, mapa.size)
  return [...prendas].sort((a, b) => mapa.get(a.id) - mapa.get(b.id))
}
