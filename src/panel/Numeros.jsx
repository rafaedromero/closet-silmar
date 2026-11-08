import { useEffect, useState } from 'react'
import { Chips } from './ui'
import { formatoRef } from '../lib/formato'

const PERIODOS = [
  ['7', 'Últimos 7 días'],
  ['30', 'Últimos 30'],
  ['todo', 'Todo'],
]
const MINIMO_VISTAS = 10 // con menos datos, cualquier nota sería adivinar

/** Nota en lenguaje simple, solo cuando hay datos suficientes */
function notaDe(e, vendida) {
  if (!e || e.vistas < MINIMO_VISTAS) return null
  const gusta = e.me_gusta / e.vistas
  const pasa = e.pasos / e.vistas
  if (e.whatsapp >= 3)
    return vendida
      ? 'Se vendió y la pedían mucho: vale la pena traer algo parecido.'
      : 'Muy buscada: si se vende, vale la pena traer algo parecido.'
  if (vendida) return null
  if (gusta >= 0.4 && e.whatsapp === 0) return 'Gusta, pero nadie escribe. ¿Revisas el precio?'
  if (pasa >= 0.7) return 'Casi todas la pasan. ¿Pruebas otra foto o moverla más adelante en la vitrina?'
  return null
}

/** Sección de estadísticas: qué se mira, qué gusta y qué se pide */
export default function Numeros({ api, prendas }) {
  const [periodo, setPeriodo] = useState('7')
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let vigente = true
    const desde = periodo === 'todo' ? null : new Date(Date.now() - Number(periodo) * 864e5).toISOString()
    setDatos(null)
    setError(null)
    api
      .estadisticas(desde)
      .then((d) => vigente && setDatos(d))
      .catch(() => vigente && setError('No se pudieron cargar los números.'))
    return () => {
      vigente = false
    }
  }, [api, periodo])

  const porPrenda = new Map((datos?.prendas ?? []).map((e) => [e.prenda_id, e]))
  const total = (k) => (datos?.prendas ?? []).reduce((s, e) => s + Number(e[k]), 0)
  const filas = prendas
    .filter((p) => p.estado_panel !== 'borrador')
    .map((p) => ({ p, e: porPrenda.get(p.id) ?? { vistas: 0, me_gusta: 0, pasos: 0, fichas: 0, whatsapp: 0 } }))
    .sort((a, b) => b.e.whatsapp - a.e.whatsapp || b.e.me_gusta - a.e.me_gusta || b.e.vistas - a.e.vistas)

  return (
    <div className="flex flex-col gap-5">
      <Chips nombre="Período" opciones={PERIODOS} valor={periodo} onCambio={setPeriodo} />

      {error ? (
        <p className="py-10 text-center text-sm text-tinta-suave">{error}</p>
      ) : !datos ? (
        <p className="py-10 text-center text-sm text-tinta-suave">Contando…</p>
      ) : (
        <>
          <dl className="m-0 grid grid-cols-2 gap-2">
            {[
              ['Visitantes', datos.visitantes, 'teléfonos distintos'],
              ['Me gusta', total('me_gusta'), 'en todas las prendas'],
              ['WhatsApp', total('whatsapp'), 'prendas consultadas'],
              ['Vendidas', datos.vendidas, 'en el período'],
            ].map(([t, n, sub]) => (
              <div key={t} className="rounded-2xl bg-superficie px-4 py-3">
                <dt className="text-xs text-tinta-suave">{t}</dt>
                <dd className="m-0 text-3xl font-medium tabular-nums">{n}</dd>
                <p className="m-0 text-[11px] text-tinta-suave">{sub}</p>
              </div>
            ))}
          </dl>

          {datos.visitantes === 0 ? (
            <p className="m-0 rounded-2xl border border-dashed border-champan px-4 py-3 text-sm text-tinta-suave">
              Todavía no hay visitas en este período. Tus visitas y las de Rafael no cuentan, así que los números
              empiezan cuando compartas el catálogo.
            </p>
          ) : (
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className="etiqueta m-0 text-xs font-normal text-tinta-suave">Por prenda</h2>
                <Leyenda />
              </div>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {filas.map(({ p, e }) => (
                  <FilaNumeros key={p.id} prenda={p} e={e} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function Leyenda() {
  return (
    <div className="flex items-center gap-3 text-[11px] text-tinta-suave" aria-hidden="true">
      <span className="flex items-center gap-1">
        <span className="h-2 w-3 rounded-sm bg-rubor-tinta" /> Me gusta
      </span>
      <span className="flex items-center gap-1">
        <span className="h-2 w-3 rounded-sm bg-superficie-2" /> Paso
      </span>
    </div>
  )
}

function FilaNumeros({ prenda, e }) {
  const decididas = e.me_gusta + e.pasos
  const pctGusta = decididas ? Math.round((e.me_gusta / decididas) * 100) : 0
  const nota = notaDe(e, prenda.estado_panel === 'vendida')
  return (
    <li className="flex gap-3 rounded-2xl border border-champan/60 px-3 py-2.5">
      <div
        className="h-[60px] w-[45px] shrink-0 overflow-hidden border border-champan bg-superficie"
        style={{ borderRadius: '999px 999px 6px 6px' }}
      >
        {prenda.foto && <img src={prenda.foto} alt="" loading="lazy" className="h-full w-full object-contain p-0.5" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="m-0 truncate text-sm font-medium">{prenda.nombre}</p>
          <span className="shrink-0 text-[11px] text-tinta-suave">
            {prenda.estado_panel === 'vendida' ? 'Vendida' : `Ref ${formatoRef(prenda.ref)}`}
          </span>
        </div>
        <p className="m-0 text-xs tabular-nums text-tinta-suave">
          {e.vistas} vistas · {e.me_gusta} me gusta · {e.fichas} fichas ·{' '}
          <span className={e.whatsapp ? 'font-medium text-tinta' : ''}>{e.whatsapp} WhatsApp</span>
        </p>
        <div
          className="flex h-2 overflow-hidden rounded-full bg-superficie-2"
          role="img"
          aria-label={decididas ? `${pctGusta}% le dio me gusta` : 'Sin decisiones todavía'}
        >
          {decididas > 0 && <span className="h-full bg-rubor-tinta" style={{ width: `${pctGusta}%` }} />}
        </div>
        {nota && <p className="m-0 text-xs text-oro-viejo">{nota}</p>}
      </div>
    </li>
  )
}
