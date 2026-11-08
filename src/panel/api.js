import { supabase } from '../lib/supabase'
import { prendasDemo, ajustesDemo } from '../lib/demo'

const COLUMNAS =
  'id, ref, nombre, descripcion, tipo, marca, talla, color, medidas, estado, precio_usd, precio_original_usd, orden, publicada, publicada_en, vendida_en, creada_en, prenda_fotos(id, ruta, orden, principal, procesada)'

// Estado de una prenda tal como lo ve Silmar
export function estadoDe(p) {
  if (p.vendida_en) return 'vendida'
  if (p.publicada) return 'disponible'
  return p.publicada_en ? 'oculta' : 'borrador'
}

// Una foto del teléfono puede pesar 5 MB o más: se reduce antes de subir
async function reducirFoto(archivo) {
  try {
    const bitmap = await createImageBitmap(archivo, { imageOrientation: 'from-image' })
    const escala = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height))
    const lienzo = document.createElement('canvas')
    lienzo.width = Math.round(bitmap.width * escala)
    lienzo.height = Math.round(bitmap.height * escala)
    lienzo.getContext('2d').drawImage(bitmap, 0, 0, lienzo.width, lienzo.height)
    const blob = await new Promise((r) => lienzo.toBlob(r, 'image/jpeg', 0.88))
    return blob || archivo
  } catch {
    return archivo // si el navegador no puede leerla, se sube tal cual
  }
}

function mensajeDe(error) {
  if (error?.hint === 'foto_sin_procesar') return 'La foto todavía no está procesada.'
  if (error?.code === '23514') return 'Hay un dato que no es válido. Revisa la talla y los precios.'
  if (error?.message?.includes('Failed to fetch')) return 'No hay conexión. Intenta de nuevo.'
  return 'No se pudo guardar. Intenta de nuevo.'
}

function verificar({ data, error }) {
  if (error) {
    console.error(error)
    throw new Error(mensajeDe(error))
  }
  return data
}

// ─────────────────────────────────────────────────────────────
// Supabase
// ─────────────────────────────────────────────────────────────
function crearApiSupabase() {
  const sb = supabase

  async function conFotos(filas) {
    const crudas = filas.flatMap((p) => p.prenda_fotos.filter((f) => !f.procesada).map((f) => f.ruta))
    const firmadas = {}
    if (crudas.length) {
      const { data } = await sb.storage.from('originales').createSignedUrls(crudas, 3600)
      for (const f of data || []) firmadas[f.path] = f.signedUrl
    }
    return filas.map((p) => {
      const fotos = [...p.prenda_fotos].sort((a, b) => Number(b.principal) - Number(a.principal) || a.orden - b.orden)
      const procesada = fotos.find((f) => f.procesada)
      const pendiente = fotos.find((f) => !f.procesada)
      const url = (f) =>
        f.procesada ? sb.storage.from('prendas').getPublicUrl(f.ruta).data.publicUrl : firmadas[f.ruta]
      return {
        ...p,
        precio_usd: Number(p.precio_usd),
        precio_original_usd: p.precio_original_usd === null ? null : Number(p.precio_original_usd),
        foto: procesada ? url(procesada) : pendiente ? url(pendiente) : null,
        fotoPendiente: pendiente ? url(pendiente) : null,
        tieneFotoProcesada: Boolean(procesada),
        estado_panel: estadoDe(p),
      }
    })
  }

  return {
    demo: false,
    async sesion() {
      const { data } = await sb.auth.getSession()
      return data.session
    },
    alCambiarSesion(fn) {
      const { data } = sb.auth.onAuthStateChange((_, sesion) => fn(sesion))
      return () => data.subscription.unsubscribe()
    },
    async enviarEnlace(correo) {
      const { error } = await sb.auth.signInWithOtp({
        email: correo,
        // Solo correos que ya existen: nadie puede registrarse por su cuenta
        options: { emailRedirectTo: `${window.location.origin}/panel`, shouldCreateUser: false },
      })
      if (error) {
        console.error(error)
        if (error.status === 429) throw new Error('Pediste varios enlaces seguidos. Espera un minuto.')
        throw new Error('Ese correo no tiene acceso al panel.')
      }
    },
    // El código del correo: necesario en el panel instalado, que no recibe la sesión del enlace
    async verificarCodigo(correo, codigo) {
      const { error } = await sb.auth.verifyOtp({ email: correo, token: codigo, type: 'email' })
      if (error) {
        console.error(error)
        throw new Error('El código no es correcto o ya venció. Pide uno nuevo.')
      }
    },
    async salir() {
      await sb.auth.signOut()
    },
    async esAdmin(sesion) {
      const { data } = await sb.from('administradoras').select('user_id').eq('user_id', sesion.user.id).maybeSingle()
      return Boolean(data)
    },
    async cargar() {
      const [prendas, ajustes, metodos, zonas, tasa] = await Promise.all([
        sb.from('prendas').select(COLUMNAS).order('orden').order('ref'),
        sb.from('ajustes').select('*').eq('id', 1).single(),
        sb.from('metodos_pago').select('*').order('orden'),
        sb.from('zonas_entrega').select('*').order('orden'),
        sb
          .from('tasas_cambio')
          .select('tasa, publicada_en, registrada_en')
          .eq('fuente', 'automatica')
          .order('publicada_en', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])
      return {
        prendas: await conFotos(verificar(prendas)),
        ajustes: verificar(ajustes),
        metodos: verificar(metodos),
        zonas: verificar(zonas),
        tasaAuto: verificar(tasa),
      }
    },
    async guardarPrenda(id, datos) {
      const consulta = id
        ? sb.from('prendas').update(datos).eq('id', id).select('id').single()
        : sb.from('prendas').insert(datos).select('id').single()
      return verificar(await consulta).id
    },
    async subirFoto(prendaId, archivo, { tieneProcesada }) {
      const blob = await reducirFoto(archivo)
      const ruta = `${prendaId}/${Date.now()}.jpg`
      verificar(await sb.storage.from('originales').upload(ruta, blob, { contentType: 'image/jpeg' }))
      // Las fotos pendientes anteriores de esta prenda se reemplazan
      verificar(await sb.from('prenda_fotos').delete().eq('prenda_id', prendaId).eq('procesada', false))
      verificar(
        await sb.from('prenda_fotos').insert({
          prenda_id: prendaId,
          ruta,
          procesada: false,
          // Si ya hay una foto publicada, sigue siendo la principal hasta que la nueva esté lista
          principal: !tieneProcesada,
        }),
      )
    },
    async cambiar(id, cambios) {
      verificar(await sb.from('prendas').update(cambios).eq('id', id))
    },
    async borrar(id) {
      verificar(await sb.from('prendas').delete().eq('id', id))
    },
    async ordenar(ids) {
      verificar(await sb.rpc('ordenar_prendas', { ids }))
    },
    async estadisticas(desde) {
      return verificar(await sb.rpc('estadisticas_panel', desde ? { desde } : {}))
    },
    async guardarAjustes(cambios) {
      verificar(await sb.from('ajustes').update(cambios).eq('id', 1))
    },
    async guardarFila(tabla, fila) {
      const { id, ...resto } = fila
      verificar(id ? await sb.from(tabla).update(resto).eq('id', id) : await sb.from(tabla).insert(resto))
    },
    async borrarFila(tabla, id) {
      verificar(await sb.from(tabla).delete().eq('id', id))
    },
  }
}

// ─────────────────────────────────────────────────────────────
// Modo demostración (solo en desarrollo, con ?demo): todo en memoria
// ─────────────────────────────────────────────────────────────
function crearApiDemo() {
  const espera = (ms = 250) => new Promise((r) => setTimeout(r, ms))
  const db = {
    prendas: prendasDemo.map((p, i) => ({
      ...p,
      orden: (i + 1) * 10,
      publicada: true,
      publicada_en: '2026-11-07',
      vendida_en: p.vendida ? '2026-11-07' : null,
      tieneFotoProcesada: true,
      fotoPendiente: null,
    })),
    ajustes: { ...ajustesDemo, whatsapp: '584121234567', tasa_manual: null, usar_tasa_manual: false },
    metodos: [
      { id: 'm1', nombre: 'Pago Móvil', descuento_pct: 0, activo: true, orden: 1 },
      { id: 'm2', nombre: 'Transferencia', descuento_pct: 0, activo: true, orden: 2 },
      { id: 'm3', nombre: 'Binance', descuento_pct: 10, activo: true, orden: 3 },
    ],
    zonas: [],
    tasaAuto: { tasa: 510.7873, publicada_en: '2026-11-06', registrada_en: '2026-11-06T20:32:00Z' },
  }
  let ref = db.prendas.length
  const conEstado = () => db.prendas.map((p) => ({ ...p, estado_panel: estadoDe(p) }))
  const buscar = (id) => db.prendas.find((p) => p.id === id)

  return {
    demo: true,
    sesion: async () => ({ user: { id: 'demo', email: 'silmar@ejemplo.com' } }),
    alCambiarSesion: () => () => {},
    enviarEnlace: espera,
    verificarCodigo: espera,
    salir: espera,
    esAdmin: async () => true,
    async cargar() {
      await espera(400)
      return structuredClone({ ...db, prendas: conEstado() })
    },
    async guardarPrenda(id, datos) {
      await espera()
      if (id) {
        Object.assign(buscar(id), datos)
        return id
      }
      const nueva = { id: `demo-${Date.now()}`, ref: ++ref, publicada: false, publicada_en: null, vendida_en: null, foto: null, tieneFotoProcesada: false, ...datos }
      db.prendas.push(nueva)
      return nueva.id
    },
    async subirFoto(prendaId, archivo) {
      await espera(600)
      const p = buscar(prendaId)
      p.fotoPendiente = URL.createObjectURL(archivo)
      if (!p.tieneFotoProcesada) p.foto = p.fotoPendiente
    },
    async cambiar(id, cambios) {
      await espera()
      const p = buscar(id)
      if (cambios.publicada && !p.tieneFotoProcesada) throw new Error('La foto todavía no está procesada.')
      if (cambios.publicada) p.publicada_en ||= new Date().toISOString()
      Object.assign(p, cambios)
    },
    async borrar(id) {
      await espera()
      db.prendas = db.prendas.filter((p) => p.id !== id)
    },
    async ordenar(ids) {
      await espera()
      ids.forEach((id, i) => (buscar(id).orden = (i + 1) * 10))
    },
    async estadisticas(desde) {
      await espera(300)
      // Números inventados para ver la sección en modo demostración
      const factor = desde ? (Date.now() - new Date(desde).getTime() < 8 * 864e5 ? 0.3 : 0.8) : 1
      const base = [
        [48, 25, 9, 18, 0],
        [40, 6, 30, 5, 1],
        [35, 14, 12, 11, 6],
      ]
      return {
        visitantes: Math.round(61 * factor),
        vendidas: desde ? 0 : 1,
        prendas: db.prendas.map((p, i) => {
          const [vistas, me_gusta, pasos, fichas, whatsapp] = base[i % base.length].map((n) => Math.round(n * factor))
          return { prenda_id: p.id, vistas, me_gusta, pasos, fichas, whatsapp }
        }),
      }
    },
    async guardarAjustes(cambios) {
      await espera()
      Object.assign(db.ajustes, cambios)
    },
    async guardarFila(tabla, fila) {
      await espera()
      const lista = tabla === 'zonas_entrega' ? db.zonas : db.metodos
      const existente = lista.find((f) => f.id === fila.id)
      if (existente) Object.assign(existente, fila)
      else lista.push({ ...fila, id: `f-${Date.now()}` })
    },
    async borrarFila(tabla, id) {
      await espera()
      if (tabla === 'zonas_entrega') db.zonas = db.zonas.filter((z) => z.id !== id)
      else db.metodos = db.metodos.filter((m) => m.id !== id)
    },
  }
}

export function crearApi() {
  const demo = import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo')
  if (demo || !supabase) return crearApiDemo()
  return crearApiSupabase()
}
