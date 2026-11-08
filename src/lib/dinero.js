// Montos con formato venezolano: $38,70 · Bs 9.194,17
const redondear = (n) => Math.round(n * 100) / 100

export function usd(n) {
  const v = redondear(n)
  const entero = Number.isInteger(v)
  return (
    '$' +
    v.toLocaleString('es-VE', {
      minimumFractionDigits: entero ? 0 : 2,
      maximumFractionDigits: 2,
    })
  )
}

export function bs(n) {
  return 'Bs ' + redondear(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export const conDescuento = (monto, pct) => redondear(monto * (1 - pct / 100))
export const aBolivares = (monto, tasa) => redondear(monto * tasa)

// "7 nov"
export function fechaCorta(iso) {
  if (!iso) return ''
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' }).replace('.', '')
}

// El método con mayor descuento activo (hoy Binance, 10%)
export function mejorDescuento(metodos) {
  return metodos
    .filter((m) => m.activo !== false && Number(m.descuento_pct) > 0)
    .sort((a, b) => b.descuento_pct - a.descuento_pct)[0]
}
