// Lógica pura de la tasa: sin red ni base de datos, para poder probarla.

export interface RespuestaDolarApi {
  fuente?: string
  nombre?: string
  compra?: number | null
  venta?: number | null
  promedio?: number | null
  fechaActualizacion?: string
}

/** La tasa del BCV: el promedio, o venta o compra si el promedio no viene. */
export function extraerTasa(d: RespuestaDolarApi): number | null {
  const valor = Number(d?.promedio ?? d?.venta ?? d?.compra)
  // Una tasa bolívar/dólar razonable: descarta ceros, textos y valores absurdos
  return Number.isFinite(valor) && valor > 1 && valor < 1_000_000 ? Math.round(valor * 10000) / 10000 : null
}

/** Fecha (AAAA-MM-DD) en hora de Caracas. Si la fecha viene mal, usa la de hoy. */
export function fechaCaracas(texto?: string, ahora = new Date()): string {
  const fecha = texto ? new Date(texto) : ahora
  const valida = Number.isNaN(fecha.getTime()) ? ahora : fecha
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(valida)
}

/** ¿Hay algo nuevo que guardar respecto a la última tasa? */
export function esNueva(
  ultima: { tasa: number | string; publicada_en: string } | null,
  tasa: number,
  fecha: string,
): boolean {
  if (!ultima) return true
  return ultima.publicada_en !== fecha || Number(ultima.tasa) !== tasa
}
