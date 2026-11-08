// Tasa BCV automática para El Closet de Silmar.
// La llama pg_cron cada 30 minutos en la tarde de los días hábiles (ver migración 0004).
// Consulta DolarApi y guarda la tasa en tasas_cambio solo si cambió.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import { esNueva, extraerTasa, fechaCaracas, type RespuestaDolarApi } from './logica.ts'

const FUENTE = 'https://ve.dolarapi.com/v1/dolares/oficial'

const responder = (cuerpo: unknown, estado = 200) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (pedido) => {
  // Solo el programador de tareas conoce el secreto
  const secreto = Deno.env.get('CRON_SECRETO')
  if (!secreto || pedido.headers.get('x-cron-secreto') !== secreto) {
    return responder({ ok: false, error: 'No autorizado' }, 401)
  }

  let datos: RespuestaDolarApi
  try {
    const r = await fetch(FUENTE, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(8000) })
    if (!r.ok) return responder({ ok: false, error: `DolarApi respondió ${r.status}` }, 502)
    datos = await r.json()
  } catch (e) {
    return responder({ ok: false, error: `No se pudo consultar DolarApi: ${e}` }, 502)
  }

  const tasa = extraerTasa(datos)
  if (tasa === null) return responder({ ok: false, error: 'La tasa recibida no es válida', datos }, 502)
  const fecha = fechaCaracas(datos.fechaActualizacion)

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: ultima, error: errorLectura } = await sb
    .from('tasas_cambio')
    .select('tasa, publicada_en')
    .eq('fuente', 'automatica')
    .order('publicada_en', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (errorLectura) return responder({ ok: false, error: errorLectura.message }, 500)

  if (!esNueva(ultima, tasa, fecha)) return responder({ ok: true, cambio: false, tasa, fecha })

  const { error } = await sb
    .from('tasas_cambio')
    .upsert({ tasa, publicada_en: fecha, fuente: 'automatica', origen: 'dolarapi' }, { onConflict: 'publicada_en,fuente' })
  if (error) return responder({ ok: false, error: error.message }, 500)

  return responder({ ok: true, cambio: true, tasa, fecha })
})
