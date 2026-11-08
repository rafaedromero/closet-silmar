import { useState } from 'react'
import { Boton, Campo, Chips, Interruptor, claseEntrada, useAvisos } from './ui'
import { fechaCorta } from '../lib/dinero'

const aNumero = (t) => (String(t ?? '').trim() === '' ? null : Number(String(t).replace(',', '.')))

/** Ajustes de la tienda: WhatsApp, textos, pagos, entrega y tasa */
export default function Ajustes({ api, datos, onCambio, onSalir }) {
  const avisar = useAvisos()
  const inicial = datos.ajustes
  const [a, setA] = useState({
    whatsapp: inicial.whatsapp ?? '',
    titulo: inicial.titulo,
    subtitulo: inicial.subtitulo,
    ciudad: inicial.ciudad,
    modo_entrega: inicial.modo_entrega,
    costo_entrega_fijo_usd: String(inicial.costo_entrega_fijo_usd ?? 0),
    usar_tasa_manual: inicial.usar_tasa_manual ?? false,
    tasa_manual: inicial.tasa_manual?.toString() ?? '',
  })
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)
  const poner = (k) => (v) => {
    setA((x) => ({ ...x, [k]: v }))
    setErrores((e) => ({ ...e, [k]: undefined }))
  }

  async function guardar() {
    const errs = {}
    const whatsapp = a.whatsapp.replace(/\D/g, '')
    if (!/^[0-9]{10,15}$/.test(whatsapp)) errs.whatsapp = 'Solo dígitos con el 58 al inicio y sin el 0, por ejemplo 584121234567'
    if (!a.titulo.trim()) errs.titulo = 'Escribe el nombre de la tienda'
    const costo = aNumero(a.costo_entrega_fijo_usd) ?? 0
    if (a.modo_entrega === 'fijo' && !(costo > 0)) errs.costo_entrega_fijo_usd = 'Escribe el costo en dólares'
    const tasa = aNumero(a.tasa_manual)
    if (a.usar_tasa_manual && !(tasa > 0)) errs.tasa_manual = 'Escribe la tasa en bolívares por dólar'
    setErrores(errs)
    if (Object.keys(errs).length) return avisar('Revisa los campos marcados', { error: true })

    setGuardando(true)
    try {
      await api.guardarAjustes({
        whatsapp,
        titulo: a.titulo.trim(),
        subtitulo: a.subtitulo.trim(),
        ciudad: a.ciudad.trim() || 'Barquisimeto',
        modo_entrega: a.modo_entrega,
        costo_entrega_fijo_usd: costo,
        usar_tasa_manual: a.usar_tasa_manual,
        tasa_manual: tasa,
      })
      avisar('Ajustes guardados')
      onCambio()
    } catch (e) {
      avisar(e.message, { error: true })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 pb-4">
      <Seccion titulo="WhatsApp">
        <Campo etiqueta="Número que recibe los pedidos" htmlFor="wa" ayuda="Con 58 al inicio y sin el 0: 0412-123-4567 se escribe 584121234567" error={errores.whatsapp}>
          <input id="wa" inputMode="numeric" className={`${claseEntrada} tabular-nums`} value={a.whatsapp} onChange={(e) => poner('whatsapp')(e.target.value)} />
        </Campo>
      </Seccion>

      <Seccion titulo="Textos de la entrada">
        <Campo etiqueta="Nombre de la tienda" htmlFor="titulo" ayuda='Se escribe a mano en la intro. Si tiene " de ", se parte en dos líneas.' error={errores.titulo}>
          <input id="titulo" className={claseEntrada} value={a.titulo} onChange={(e) => poner('titulo')(e.target.value)} />
        </Campo>
        <Campo etiqueta="Frase debajo del nombre" htmlFor="subtitulo">
          <input id="subtitulo" className={claseEntrada} value={a.subtitulo} onChange={(e) => poner('subtitulo')(e.target.value)} />
        </Campo>
      </Seccion>

      <Seccion titulo="Entrega">
        <Campo etiqueta="Ciudad" htmlFor="ciudad">
          <input id="ciudad" className={claseEntrada} value={a.ciudad} onChange={(e) => poner('ciudad')(e.target.value)} />
        </Campo>
        <Campo etiqueta="Costo de entrega">
          <Chips
            nombre="Costo de entrega"
            opciones={[
              ['gratis', 'Gratis'],
              ['fijo', 'Costo fijo'],
              ['por_zona', 'Según la zona'],
            ]}
            valor={a.modo_entrega}
            onCambio={poner('modo_entrega')}
          />
        </Campo>
        {a.modo_entrega === 'fijo' && (
          <Campo etiqueta="Costo fijo ($)" htmlFor="costo" error={errores.costo_entrega_fijo_usd}>
            <input id="costo" inputMode="decimal" className={`${claseEntrada} tabular-nums`} value={a.costo_entrega_fijo_usd} onChange={(e) => poner('costo_entrega_fijo_usd')(e.target.value)} />
          </Campo>
        )}
        {a.modo_entrega === 'por_zona' && (
          <ListaEditable
            api={api}
            tabla="zonas_entrega"
            filas={datos.zonas}
            onCambio={onCambio}
            campoValor="costo_usd"
            etiquetaValor="Costo $"
            placeholderNombre="Nueva zona, por ejemplo Este"
            vacio="Agrega las zonas donde entregas y su costo."
          />
        )}
      </Seccion>

      <Seccion titulo="Tasa del dólar">
        <EstadoTasa tasa={datos.tasaAuto} />
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="usar-manual" className="text-sm">
            Usar una tasa fija en lugar de la del BCV
          </label>
          <Interruptor id="usar-manual" activo={a.usar_tasa_manual} onCambio={poner('usar_tasa_manual')} etiqueta="Usar una tasa fija" />
        </div>
        {a.usar_tasa_manual && (
          <Campo etiqueta="Tasa fija (Bs por $)" htmlFor="tasa" error={errores.tasa_manual}>
            <input id="tasa" inputMode="decimal" className={`${claseEntrada} tabular-nums`} value={a.tasa_manual} onChange={(e) => poner('tasa_manual')(e.target.value)} />
          </Campo>
        )}
      </Seccion>

      <Boton variante="primario" cargando={guardando} onClick={guardar}>
        Guardar ajustes
      </Boton>

      <Seccion titulo="Métodos de pago" nota="Se guardan al momento">
        <ListaEditable
          api={api}
          tabla="metodos_pago"
          filas={datos.metodos}
          onCambio={onCambio}
          campoValor="descuento_pct"
          etiquetaValor="Descuento %"
          conActivo
          placeholderNombre="Nuevo método, por ejemplo Zelle"
          vacio="Agrega cómo te pueden pagar."
        />
      </Seccion>

      <div className="flex flex-col items-center gap-1 border-t border-champan/40 pt-6">
        <Boton variante="fantasma" onClick={onSalir}>
          Cerrar sesión
        </Boton>
      </div>
    </div>
  )
}

function Seccion({ titulo, nota, children }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="etiqueta m-0 text-xs font-normal text-tinta-suave">{titulo}</h2>
        {nota && <span className="text-[11px] text-tinta-suave">{nota}</span>}
      </div>
      {children}
    </section>
  )
}

/** Filas de nombre + valor que se guardan al cambiar (métodos de pago y zonas) */
function ListaEditable({ api, tabla, filas, onCambio, campoValor, etiquetaValor, conActivo = false, placeholderNombre, vacio }) {
  const avisar = useAvisos()
  const [nuevo, setNuevo] = useState({ nombre: '', valor: '' })

  async function guardar(fila, mensaje) {
    try {
      await api.guardarFila(tabla, fila)
      if (mensaje) avisar(mensaje)
      onCambio()
    } catch (e) {
      avisar(e.message, { error: true })
    }
  }

  async function agregar() {
    if (!nuevo.nombre.trim()) return
    const valor = aNumero(nuevo.valor) ?? 0
    await guardar({ nombre: nuevo.nombre.trim(), [campoValor]: valor, orden: filas.length + 1, ...(conActivo ? { activo: true } : {}) }, 'Agregado')
    setNuevo({ nombre: '', valor: '' })
  }

  async function borrar(fila) {
    try {
      await api.borrarFila(tabla, fila.id)
      avisar(`${fila.nombre} eliminado`)
      onCambio()
    } catch (e) {
      avisar(e.message, { error: true })
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {filas.length === 0 && <p className="m-0 text-sm text-tinta-suave">{vacio}</p>}
      {filas.map((f) => (
        <div key={f.id} className="flex items-center gap-2 rounded-2xl border border-champan/60 px-3 py-2">
          <span className={`min-w-0 flex-1 truncate text-sm ${conActivo && !f.activo ? 'text-tinta-suave line-through' : ''}`}>{f.nombre}</span>
          <input
            aria-label={`${etiquetaValor} de ${f.nombre}`}
            inputMode="decimal"
            defaultValue={Number(f[campoValor])}
            onBlur={(e) => {
              const v = aNumero(e.target.value) ?? 0
              if (v !== Number(f[campoValor])) guardar({ id: f.id, [campoValor]: v }, 'Guardado')
            }}
            className="h-10 w-16 rounded-lg border border-champan bg-fondo px-2 text-right text-sm tabular-nums"
          />
          <span className="w-4 text-xs text-tinta-suave">{campoValor === 'descuento_pct' ? '%' : '$'}</span>
          {conActivo && (
            <Interruptor activo={f.activo} etiqueta={`Activar ${f.nombre}`} onCambio={(v) => guardar({ id: f.id, activo: v }, v ? `${f.nombre} activo` : `${f.nombre} desactivado`)} />
          )}
          <button type="button" onClick={() => borrar(f)} className="grid h-10 w-10 place-items-center rounded-full text-tinta-suave" aria-label={`Eliminar ${f.nombre}`}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input
          aria-label="Nombre"
          className={`${claseEntrada} min-h-11 flex-1`}
          placeholder={placeholderNombre}
          value={nuevo.nombre}
          onChange={(e) => setNuevo((n) => ({ ...n, nombre: e.target.value }))}
        />
        <input
          aria-label={etiquetaValor}
          inputMode="decimal"
          className="h-11 w-16 rounded-xl border border-champan bg-fondo px-2 text-right text-sm tabular-nums"
          placeholder={campoValor === 'descuento_pct' ? '%' : '$'}
          value={nuevo.valor}
          onChange={(e) => setNuevo((n) => ({ ...n, valor: e.target.value }))}
        />
        <Boton className="min-h-11 shrink-0 px-4" onClick={agregar}>
          Agregar
        </Boton>
      </div>
    </div>
  )
}

// Muestra la última tasa automática y avisa si lleva días sin actualizarse
function EstadoTasa({ tasa }) {
  if (!tasa) return <p className="m-0 text-sm text-tinta-suave">La tasa BCV automática todavía no está activa.</p>
  const monto = Number(tasa.tasa).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  const hora = tasa.registrada_en
    ? new Date(tasa.registrada_en).toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Caracas' })
    : null
  const [a, m, d] = tasa.publicada_en.split('-').map(Number)
  const dias = Math.floor((Date.now() - new Date(a, m - 1, d).getTime()) / 86400000)
  // Un fin de semana largo son 3 o 4 días sin tasa nueva; más que eso es raro
  const atrasada = dias > 4
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-sm text-tinta-suave">
        Tasa BCV automática: <span className="font-medium tabular-nums text-tinta">Bs {monto}</span>, publicada el{' '}
        {fechaCorta(tasa.publicada_en)}
        {hora ? ` y detectada a las ${hora}` : ''}.
      </p>
      {atrasada && (
        <p className="m-0 rounded-2xl border border-dashed border-oro-viejo px-4 py-2.5 text-sm text-oro-viejo">
          La tasa automática no se actualiza desde hace {dias} días. Mientras se revisa, puedes fijar una a mano aquí abajo.
        </p>
      )}
    </div>
  )
}
