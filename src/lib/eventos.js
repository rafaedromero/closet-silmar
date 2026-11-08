import { supabase } from './supabase'
import { guardar, leer } from './memoria'

// Estadísticas anónimas: qué prendas se miran, gustan, se pasan y se piden.
// Sin nombres ni datos personales: solo un identificador aleatorio de este teléfono.
// Las visitas de Silmar y Rafael (con sesión abierta en el panel) no cuentan.

const ES_UUID = /^[0-9a-f-]{36}$/i

// UUID v4 con getRandomValues: funciona también fuera de https (por ejemplo, en la red de la casa)
function nuevoId() {
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

function idDelTelefono() {
  let id = leer('sesion')
  if (!id || !ES_UUID.test(id)) {
    id = nuevoId()
    guardar('sesion', id)
  }
  return id
}

// ¿Este teléfono tiene sesión del panel? Se averigua una vez
let excluido = null
async function esAdministradora() {
  if (excluido === null) {
    try {
      const { data } = await supabase.auth.getSession()
      excluido = Boolean(data.session)
    } catch {
      excluido = false
    }
  }
  return excluido
}

// Lo ya registrado en este teléfono, para contar una sola vez
function registrados() {
  try {
    return new Set(JSON.parse(leer('eventos') || '[]'))
  } catch {
    return new Set()
  }
}

export async function registrar(prendaId, tipo) {
  if (!supabase || !prendaId || !ES_UUID.test(prendaId)) return // datos de ejemplo: no se registra
  const clave = `${prendaId}:${tipo}`
  const hechos = registrados()
  if (hechos.has(clave)) return
  if (await esAdministradora()) return
  hechos.add(clave)
  guardar('eventos', JSON.stringify([...hechos]))
  // Si falla (sin señal), no pasa nada: es una estadística, no una venta
  supabase
    .from('eventos')
    .insert({ prenda_id: prendaId, tipo, sesion: idDelTelefono() })
    .then(() => {})
}
