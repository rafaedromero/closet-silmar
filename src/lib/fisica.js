// Valores de la física de la vitrina. Se afinan en vivo abriendo la página con ?fisica
export const FISICA_INICIAL = {
  // Cuánto hay que arrastrar (px) o qué tan rápido (px/s) para lanzar la tarjeta
  umbralDistancia: 110,
  umbralVelocidad: 600,
  // Resistencia del arrastre: 0 = no se mueve, 1 = sigue al dedo sin resistencia
  elasticidad: 0.65,
  // Regreso al centro cuando no alcanza para lanzar (la liga que rebota)
  rigidezRetorno: 520,
  amortiguacionRetorno: 14,
  // Salida: fuerza del lanzamiento
  rigidezLanzamiento: 140,
  amortiguacionLanzamiento: 22,
  // Entrada de la siguiente tarjeta
  rigidezEntrada: 380,
  amortiguacionEntrada: 18,
  // Giro máximo en grados al arrastrar
  giroMaximo: 12,
}

export const RANGOS = {
  umbralDistancia: [40, 220, 5, 'px'],
  umbralVelocidad: [200, 1500, 50, 'px/s'],
  elasticidad: [0.1, 1, 0.05, ''],
  rigidezRetorno: [100, 1000, 20, ''],
  amortiguacionRetorno: [4, 40, 1, ''],
  rigidezLanzamiento: [40, 400, 10, ''],
  amortiguacionLanzamiento: [5, 50, 1, ''],
  rigidezEntrada: [100, 800, 20, ''],
  amortiguacionEntrada: [5, 40, 1, ''],
  giroMaximo: [0, 25, 1, '°'],
}

export const NOMBRES = {
  umbralDistancia: 'Distancia para lanzar',
  umbralVelocidad: 'Velocidad para lanzar',
  elasticidad: 'Elasticidad del arrastre',
  rigidezRetorno: 'Fuerza del rebote',
  amortiguacionRetorno: 'Freno del rebote',
  rigidezLanzamiento: 'Fuerza del lanzamiento',
  amortiguacionLanzamiento: 'Freno del lanzamiento',
  rigidezEntrada: 'Fuerza de entrada',
  amortiguacionEntrada: 'Freno de entrada',
  giroMaximo: 'Giro al arrastrar',
}
