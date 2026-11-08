import { aBolivares, bs, conDescuento, fechaCorta, mejorDescuento, usd } from './dinero'
import { formatoRef } from './formato'

function linea(p) {
  const marca = p.marca ? ` (${p.marca})` : ''
  return `• Ref ${formatoRef(p.ref)} · ${p.nombre}${marca}, talla ${p.talla} · ${usd(p.precio_usd)}`
}

function textoEntrega(ajustes) {
  if (ajustes.modo_entrega === 'gratis') return `Entrega gratis en ${ajustes.ciudad}.`
  if (ajustes.modo_entrega === 'fijo')
    return `Entrega en ${ajustes.ciudad}: ${usd(ajustes.costo_entrega_fijo_usd)}.`
  return `Entrega en ${ajustes.ciudad}, según la zona.`
}

/** Mensaje para una o varias prendas, listo para WhatsApp */
export function armarMensaje({ prendas, ajustes, metodos, tasa }) {
  const total = prendas.reduce((s, p) => s + Number(p.precio_usd), 0)
  const promo = mejorDescuento(metodos)
  const nombre = (ajustes.titulo || '').replace(/^El Closet de /, '') || 'Silmar'

  const partes = [
    prendas.length === 1
      ? `Hola ${nombre}, vi tu catálogo y me interesa esta pieza:`
      : `Hola ${nombre}, vi tu catálogo y me interesan estas piezas:`,
    '',
    ...prendas.map(linea),
    '',
  ]
  if (prendas.length > 1) partes.push(`Total: ${usd(total)}`)
  if (promo) partes.push(`Con ${promo.nombre} (${Number(promo.descuento_pct)}% menos): ${usd(conDescuento(total, promo.descuento_pct))}`)
  if (tasa?.tasa) partes.push(`En bolívares, tasa BCV del ${fechaCorta(tasa.publicada_en)}: ${bs(aBolivares(total, tasa.tasa))}`)
  partes.push('', textoEntrega(ajustes), prendas.length === 1 ? '¿Sigue disponible?' : '¿Siguen disponibles?')
  return partes.join('\n')
}

export function enlaceWhatsApp(numero, mensaje) {
  if (!numero) return null
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
}
