import { deepStrictEqual as assertEquals } from 'node:assert'
import { esNueva, extraerTasa, fechaCaracas } from './logica.ts'

Deno.test('toma el promedio, o venta, o compra', () => {
  assertEquals(extraerTasa({ promedio: 510.78732 }), 510.7873)
  assertEquals(extraerTasa({ promedio: null, venta: 512.1 }), 512.1)
  assertEquals(extraerTasa({ compra: 509 }), 509)
})

Deno.test('descarta tasas inválidas', () => {
  assertEquals(extraerTasa({}), null)
  assertEquals(extraerTasa({ promedio: 0 }), null)
  assertEquals(extraerTasa({ promedio: Number.NaN }), null)
})

Deno.test('fecha en hora de Caracas', () => {
  // 02:00 UTC del 7 es todavía el 6 en Caracas (UTC-4)
  assertEquals(fechaCaracas('2026-11-07T02:00:00.000Z'), '2026-11-06')
  assertEquals(fechaCaracas('2026-11-07T16:30:00-04:00'), '2026-11-07')
  assertEquals(fechaCaracas('no es fecha', new Date('2026-11-07T20:00:00Z')), '2026-11-07')
})

Deno.test('solo guarda cuando cambia algo', () => {
  assertEquals(esNueva(null, 510, '2026-11-07'), true)
  assertEquals(esNueva({ tasa: '510.0000', publicada_en: '2026-11-07' }, 510, '2026-11-07'), false)
  assertEquals(esNueva({ tasa: 510, publicada_en: '2026-11-06' }, 512, '2026-11-07'), true)
})
