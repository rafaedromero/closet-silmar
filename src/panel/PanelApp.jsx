import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { crearApi } from './api'
import Acceso from './Acceso'
import Prendas from './Prendas'
import Editor from './Editor'
import Ajustes from './Ajustes'
import Numeros from './Numeros'
import { Boton, ProveedorAvisos } from './ui'

// Convierte el panel en app instalable: manifiesto, ícono y modo pantalla completa
function prepararInstalacion() {
  const agregar = (tag, attrs) => {
    const el = document.createElement(tag)
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v))
    document.head.appendChild(el)
  }
  agregar('link', { rel: 'manifest', href: '/panel.webmanifest' })
  agregar('link', { rel: 'apple-touch-icon', href: '/iconos/panel-180.png' })
  agregar('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' })
  agregar('meta', { name: 'apple-mobile-web-app-title', content: 'Mi Closet' })
  document.title = 'Panel · El Closet de Silmar'
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.register('/panel-sw.js', { scope: '/panel' }).catch(() => {})
  }
}

export default function PanelApp() {
  const api = useMemo(() => crearApi(), [])
  const [sesion, setSesion] = useState(undefined) // undefined = revisando
  const [autorizada, setAutorizada] = useState(null)

  useEffect(() => {
    prepararInstalacion()
    api.sesion().then(setSesion)
    return api.alCambiarSesion(setSesion)
  }, [api])

  useEffect(() => {
    if (!sesion) return
    let vigente = true
    api.esAdmin(sesion).then((ok) => vigente && setAutorizada(ok))
    return () => {
      vigente = false
    }
  }, [api, sesion])

  let contenido
  if (sesion === undefined || (sesion && autorizada === null)) {
    contenido = <Cargando />
  } else if (!sesion) {
    contenido = <Acceso api={api} />
  } else if (!autorizada) {
    contenido = <SinAcceso correo={sesion.user.email} onSalir={() => api.salir()} />
  } else {
    contenido = <Escritorio api={api} correo={sesion.user.email} />
  }

  return (
    <ProveedorAvisos>
      <div className="mx-auto flex min-h-full max-w-md flex-col">{contenido}</div>
    </ProveedorAvisos>
  )
}

function Cargando() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <motion.p
        className="m-0 font-firma text-5xl"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.6, repeat: Infinity }}
      >
        Mi Closet
      </motion.p>
    </div>
  )
}

function SinAcceso({ correo, onSalir }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="m-0 font-firma text-5xl">Mi Closet</p>
      <p className="m-0 text-sm text-tinta-suave">
        {correo} no tiene acceso a este panel. Si es un error, pídele a Rafael que lo agregue.
      </p>
      <Boton onClick={onSalir}>Usar otro correo</Boton>
    </div>
  )
}

const SECCIONES = [
  ['prendas', 'Prendas', IconoLista],
  ['nueva', 'Nueva', IconoMas],
  ['numeros', 'Números', IconoNumeros],
  ['ajustes', 'Ajustes', IconoAjustes],
]

function Escritorio({ api, correo }) {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)
  const [seccion, setSeccion] = useState('prendas')
  const [editando, setEditando] = useState(null) // id de prenda, o 'nueva'

  const recargar = useCallback(async () => {
    try {
      setError(null)
      setDatos(await api.cargar())
    } catch (e) {
      console.error(e)
      setError('No se pudieron cargar tus prendas. Revisa la conexión.')
    }
  }, [api])

  useEffect(() => {
    recargar()
  }, [recargar])

  const prendaEditando = editando && editando !== 'nueva' ? datos?.prendas.find((p) => p.id === editando) : null

  return (
    <>
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-20 flex items-center justify-between gap-3 bg-fondo/95 px-[max(16px,env(safe-area-inset-left))] pb-2 pt-3 backdrop-blur">
        <div className="min-w-0">
          <p className="m-0 font-firma text-[2.2rem] leading-none">Mi Closet</p>
          <p className="m-0 truncate text-xs text-tinta-suave">
            {api.demo ? 'Modo demostración · nada se guarda' : correo}
          </p>
        </div>
        <a
          href="/"
          className="shrink-0 rounded-full border border-champan px-3 py-1.5 text-xs text-tinta no-underline"
          target="_blank"
          rel="noopener"
        >
          Ver catálogo
        </a>
      </header>

      <main className="flex-1 px-[max(16px,env(safe-area-inset-left))] pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-2">
        {error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="m-0 text-sm text-tinta-suave">{error}</p>
            <Boton onClick={recargar}>Intentar de nuevo</Boton>
          </div>
        ) : !datos ? (
          <p className="py-16 text-center text-sm text-tinta-suave">Cargando tus prendas…</p>
        ) : seccion === 'numeros' ? (
          <Numeros api={api} prendas={datos.prendas} />
        ) : seccion === 'ajustes' ? (
          <Ajustes api={api} datos={datos} onCambio={recargar} onSalir={() => api.salir()} />
        ) : (
          <Prendas api={api} prendas={datos.prendas} onEditar={setEditando} onCambio={recargar} />
        )}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-champan/50 bg-fondo/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur"
        aria-label="Secciones"
      >
        <div className="mx-auto grid max-w-md grid-cols-4">
          {SECCIONES.map(([clave, texto, icono]) => {
            const Icono = icono
            const activa = clave === 'nueva' ? false : seccion === clave
            return (
              <button
                key={clave}
                type="button"
                onClick={() => (clave === 'nueva' ? setEditando('nueva') : setSeccion(clave))}
                aria-current={activa ? 'page' : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs ${
                  activa ? 'font-medium text-tinta' : 'text-tinta-suave'
                }`}
              >
                <span
                  className={`grid h-8 w-12 place-items-center rounded-full ${
                    clave === 'nueva' ? 'bg-tinta text-fondo' : activa ? 'bg-superficie' : ''
                  }`}
                >
                  <Icono />
                </span>
                {texto}
              </button>
            )
          })}
        </div>
      </nav>

      <AnimatePresence>
        {editando && datos && (
          <Editor
            key={editando}
            api={api}
            prenda={prendaEditando}
            onCerrar={() => setEditando(null)}
            onGuardado={async (id) => {
              await recargar()
              if (id) setEditando(id)
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}

const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, className: 'h-5 w-5' }
function IconoLista() {
  return (
    <svg {...base}>
      <path d="M12 5.5a1.6 1.6 0 1 1 1.6 1.6c-.6 0-1.6.4-1.6 1.4M12 8.5 4 13.2c-.6.4-.3 1.3.4 1.3h15.2c.7 0 1-.9.4-1.3L12 8.5" />
      <path d="M6 18h12" />
    </svg>
  )
}
function IconoMas() {
  return (
    <svg {...base}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
function IconoNumeros() {
  return (
    <svg {...base}>
      <path d="M5 19V11M12 19V5M19 19v-5" />
    </svg>
  )
}
function IconoAjustes() {
  return (
    <svg {...base}>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </svg>
  )
}
