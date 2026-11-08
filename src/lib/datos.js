import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { ajustesDemo, metodosDemo, prendasDemo, tasaDemo } from './demo'

const DEMO = { prendas: prendasDemo, ajustes: ajustesDemo, metodos: metodosDemo, tasa: tasaDemo, origen: 'ejemplo' }

function urlFoto(ruta) {
  if (!ruta) return null
  return supabase.storage.from('prendas').getPublicUrl(ruta).data.publicUrl
}

// Fila de la base → prenda como la usa el catálogo
export function urlFotoPublica(ruta) {
  return urlFoto(ruta)
}

export function adaptarPrenda(fila) {
  // Solo fotos procesadas: las originales viven en un bucket privado
  const fotos = (fila.prenda_fotos || []).filter((f) => f.procesada !== false).sort(
    (a, b) => Number(b.principal) - Number(a.principal) || a.orden - b.orden,
  )
  return {
    ...fila,
    precio_usd: Number(fila.precio_usd),
    precio_original_usd: fila.precio_original_usd === null ? null : Number(fila.precio_original_usd),
    foto: urlFoto(fotos[0]?.ruta),
    fotos: fotos.map((f) => urlFoto(f.ruta)),
    vendida: Boolean(fila.vendida_en),
  }
}

async function cargar() {
  const [prendas, ajustes, metodos, tasa] = await Promise.all([
    supabase
      .from('prendas')
      .select(
        'id, ref, nombre, descripcion, tipo, marca, talla, color, medidas, estado, precio_usd, precio_original_usd, orden, vendida_en, prenda_fotos(ruta, orden, principal, procesada)',
      )
      .eq('publicada', true)
      .order('orden')
      .order('ref'),
    supabase.from('ajustes').select('*').eq('id', 1).single(),
    supabase.from('metodos_pago').select('nombre, descuento_pct, activo, orden').eq('activo', true).order('orden'),
    supabase.from('tasa_vigente').select('*').maybeSingle(),
  ])
  const error = prendas.error || ajustes.error || metodos.error || tasa.error
  if (error) throw error

  return {
    prendas: prendas.data.map(adaptarPrenda).filter((p) => p.foto),
    ajustes: ajustes.data,
    metodos: metodos.data.map((m) => ({ ...m, descuento_pct: Number(m.descuento_pct) })),
    tasa: tasa.data?.tasa ? { ...tasa.data, tasa: Number(tasa.data.tasa) } : null,
    origen: 'supabase',
  }
}

// En desarrollo, sin prendas cargadas aún, se muestran las de ejemplo
function conRespaldo(datos) {
  if (datos.prendas.length === 0 && import.meta.env.DEV) return { ...datos, prendas: prendasDemo, origen: 'ejemplo' }
  return datos
}

/**
 * Datos de la tienda. Sin Supabase configurado usa los de ejemplo.
 * En desarrollo, si la base aún no tiene prendas, también usa los de ejemplo
 * para poder seguir trabajando; publicado, muestra la tienda vacía.
 */
export function useDatosTienda() {
  const [estado, setEstado] = useState(() =>
    supabase ? { cargando: true, error: null, datos: null } : { cargando: false, error: null, datos: DEMO },
  )

  const recargar = useCallback(async () => {
    if (!supabase) return
    setEstado((e) => ({ ...e, cargando: true, error: null }))
    try {
      const datos = await cargar()
      setEstado({ cargando: false, error: null, datos: conRespaldo(datos) })
    } catch (error) {
      console.error('No se pudo cargar la tienda', error)
      setEstado({ cargando: false, error, datos: null })
    }
  }, [])

  useEffect(() => {
    if (!supabase) return
    let vigente = true
    cargar()
      .then((datos) => {
        if (!vigente) return
        setEstado({ cargando: false, error: null, datos: conRespaldo(datos) })
      })
      .catch((error) => {
        if (!vigente) return
        console.error('No se pudo cargar la tienda', error)
        setEstado({ cargando: false, error, datos: null })
      })
    return () => {
      vigente = false
    }
  }, [])

  const datosRef = useRef(null)
  useEffect(() => {
    datosRef.current = estado.datos
  }, [estado.datos])

  // ── Tiempo real: ventas, precios y cambios llegan sin recargar ──
  useEffect(() => {
    if (!supabase) return
    let vigente = true
    let pendiente = null

    // Recarga silenciosa: sin pantalla de carga, conserva lo que se ve si falla
    const refrescar = () => {
      clearTimeout(pendiente)
      pendiente = setTimeout(() => {
        cargar()
          .then((datos) => vigente && setEstado((e) => (e.datos ? { ...e, datos: conRespaldo(datos) } : e)))
          .catch(() => {})
      }, 400)
    }

    const canal = supabase
      .channel('prendas-en-vivo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prendas' }, (cambio) => {
        const actuales = datosRef.current
        if (!actuales || actuales.origen !== 'supabase') return
        // Una prenda recién publicada trae foto y datos que este aviso no incluye
        if (aplicarCambio(actuales.prendas, cambio) === null) return refrescar()
        setEstado((e) => ({
          ...e,
          datos: { ...e.datos, prendas: aplicarCambio(e.datos.prendas, cambio) ?? e.datos.prendas },
        }))
      })
      .subscribe()

    // Si el teléfono estuvo bloqueado, pudo perderse algún aviso: al volver, se refresca
    const alVolver = () => document.visibilityState === 'visible' && refrescar()
    document.addEventListener('visibilitychange', alVolver)

    return () => {
      vigente = false
      clearTimeout(pendiente)
      document.removeEventListener('visibilitychange', alVolver)
      supabase.removeChannel(canal)
    }
  }, [])

  // Solo en desarrollo: simular una venta desde la consola con closet.vender(ref)
  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.closet = {
      vender(ref, vendida = true) {
        setEstado((e) => !e.datos ? e : ({
          ...e,
          datos: {
            ...e.datos,
            prendas: e.datos.prendas.map((p) =>
              p.ref === ref ? { ...p, vendida, vendida_en: vendida ? new Date().toISOString() : null } : p,
            ),
          },
        }))
      },
    }
    return () => delete window.closet
  }, [])

  return { ...estado, recargar }
}

/**
 * Aplica un aviso de la base a la lista. Devuelve null si la prenda no se conocía
 * (hay que recargar para traer su foto).
 */
export function aplicarCambio(prendas, cambio) {
  if (cambio.eventType === 'DELETE') return prendas.filter((p) => p.id !== cambio.old.id)
  const fila = cambio.new
  const actual = prendas.find((p) => p.id === fila.id)
  if (!actual) return fila.publicada ? null : prendas
  if (!fila.publicada) return prendas.filter((p) => p.id !== fila.id)
  return prendas.map((p) =>
    p.id === fila.id
      ? adaptarPrenda({ ...p, ...fila, prenda_fotos: p.prenda_fotos, foto: undefined })
      : p,
  )
}
