// Descarga fotos en segundo plano para que estén listas antes de que su tarjeta aparezca
const pedidas = new Set()

export function precargar(urls) {
  for (const url of urls) {
    if (!url || pedidas.has(url)) continue
    pedidas.add(url)
    const img = new Image()
    img.decoding = 'async'
    img.src = url
  }
}
