// Recuerdos del teléfono de la clienta (primera visita, tutorial visto).
// Si el navegador no permite guardar, el catálogo funciona igual.
export function leer(clave) {
  try {
    return window.localStorage.getItem(`closet:${clave}`)
  } catch {
    return null
  }
}

export function guardar(clave, valor = '1') {
  try {
    window.localStorage.setItem(`closet:${clave}`, valor)
  } catch {
    /* sin almacenamiento disponible */
  }
}
