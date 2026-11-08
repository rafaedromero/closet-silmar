import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Intro from './components/Intro'
import Vitrina from './components/Vitrina'
import Ficha from './components/Ficha'
import Revision from './components/Revision'
import EstadoTienda from './components/EstadoTienda'
import PanelFisica from './components/PanelFisica'
import { IconoBolsa, IconoTema } from './components/Iconos'
import { ajustesDemo } from './lib/demo'
import { useDatosTienda } from './lib/datos'
import { FISICA_INICIAL } from './lib/fisica'
import { guardar, leer } from './lib/memoria'
import { useSeleccion } from './lib/seleccion'
import { precargar } from './lib/precarga'
import { useFilaEstable } from './lib/filaEstable'
import { registrar } from './lib/eventos'

const conPanelFisica = new URLSearchParams(window.location.search).has('fisica')
const TEMAS = { auto: null, dia: 'dia', noche: 'noche' }
const SIGUIENTE = { auto: 'dia', dia: 'noche', noche: 'auto' }
const TEXTO_TEMA = { auto: 'Automático', dia: 'Día', noche: 'Noche' }

const yaVisito = leer('visitado') === '1'
const yaVioTutorial = leer('tutorial') === '1'

export default function App() {
  const [fisica, setFisica] = useState(FISICA_INICIAL)
  const [tema, setTema] = useState('auto')
  const [fase, setFase] = useState('intro')
  const [tutorial, setTutorial] = useState(false)
  const [fichaId, setFichaId] = useState(null)
  const [revision, setRevision] = useState(null) // null | { terminoFila: boolean }
  const vitrina = useRef(null)

  const tienda = useDatosTienda()
  const prendas = useMemo(() => tienda.datos?.prendas ?? [], [tienda.datos])
  const ajustes = tienda.datos?.ajustes ?? ajustesDemo
  const metodos = tienda.datos?.metodos ?? []
  const tasa = tienda.datos?.tasa ?? null
  const datosDeEjemplo = import.meta.env.DEV && tienda.datos?.origen === 'ejemplo'

  const { decisiones, decidir, olvidar } = useSeleccion()
  const fila = useFilaEstable(prendas)
  const pendientes = fila.filter((p) => !decisiones[p.id])
  const gustan = prendas.filter((p) => decisiones[p.id] === 'me_gusta' && !p.vendida).length
  const disponibles = prendas.filter((p) => !p.vendida).length
  const ficha = prendas.find((p) => p.id === fichaId)

  // Las primeras fotos se descargan mientras corre la intro
  useEffect(() => {
    precargar(fila.slice(0, 4).map((p) => p.foto))
  }, [fila])

  useEffect(() => {
    const valor = TEMAS[tema]
    if (valor) document.documentElement.dataset.tema = valor
    else delete document.documentElement.dataset.tema
  }, [tema])

  function comenzar() {
    guardar('visitado')
    setFase('vitrina')
    if (!yaVioTutorial) setTutorial(true)
  }

  function finTutorial() {
    guardar('tutorial')
    setTutorial(false)
  }

  // Decisión desde la vitrina: si era la última, se abre la revisión
  const alDecidirEnVitrina = useCallback(
    (id, tipo) => {
      // Las vendidas solo se miran: no cuentan como me gusta ni como paso
      const prenda = prendas.find((p) => p.id === id)
      decidir(id, prenda?.vendida ? 'visto' : tipo)
      if (!prenda?.vendida) registrar(id, tipo)
      const quedan = fila.filter((p) => !decisiones[p.id] && p.id !== id).length
      if (quedan === 0) setTimeout(() => setRevision({ terminoFila: true }), 350)
    },
    [decidir, decisiones, fila, prendas],
  )

  // Decisión desde la ficha: si es la prenda de arriba, se cierra la ficha y la tarjeta sale volando
  function alDecidirEnFicha(tipo) {
    const esLaDeArriba = pendientes[0]?.id === ficha.id && !revision
    if (esLaDeArriba) {
      setFichaId(null)
      setTimeout(() => vitrina.current?.decidir(tipo === 'me_gusta' ? 1 : -1), 320)
    } else {
      decidir(ficha.id, tipo)
      registrar(ficha.id, tipo)
    }
  }

  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-col items-center overflow-x-hidden px-[max(16px,env(safe-area-inset-left))] py-4">
      <AnimatePresence mode="wait">
        {fase === 'intro' ? (
          <Intro
            key="intro"
            titulo={ajustes.titulo}
            subtitulo={ajustes.subtitulo}
            disponibles={tienda.datos ? disponibles : null}
            rapida={yaVisito}
            onComenzar={comenzar}
          />
        ) : (
          <motion.div
            key="vitrina"
            className="flex w-full flex-1 flex-col items-center gap-4"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
          >
            <header className="flex w-full items-center justify-between gap-3">
              <h1 className="m-0 whitespace-nowrap font-firma text-[2.1rem] font-normal leading-none">{ajustes.titulo}</h1>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTutorial(true)}
                  className="grid h-8 w-8 place-items-center rounded-full border border-champan text-xs text-tinta-suave"
                  aria-label="Ver cómo funciona"
                  title="Ver cómo funciona"
                >
                  ?
                </button>
                <button
                  type="button"
                  onClick={() => setTema(SIGUIENTE[tema])}
                  className="grid h-8 w-8 place-items-center rounded-full border border-champan text-tinta-suave"
                  aria-label={`Tema: ${TEXTO_TEMA[tema]}. Cambiar`}
                  title={`Tema: ${TEXTO_TEMA[tema]}`}
                >
                  <IconoTema tema={tema} />
                </button>
                <button
                  type="button"
                  onClick={() => setRevision({ terminoFila: false })}
                  className="relative grid h-8 w-8 place-items-center rounded-full border border-champan text-tinta"
                  aria-label={`Tu selección: ${gustan} ${gustan === 1 ? 'prenda' : 'prendas'}`}
                  title="Tu selección"
                >
                  <IconoBolsa />
                  <AnimatePresence>
                    {gustan > 0 && (
                      <motion.span
                        key={gustan}
                        className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-rubor-tinta px-1 text-[10px] font-medium tabular-nums text-fondo"
                        initial={{ scale: 0.4 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                      >
                        {gustan}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </header>

            {datosDeEjemplo && (
              <p className="m-0 -mt-2 self-start rounded-full bg-rubor px-3 py-0.5 text-[11px] text-rubor-tinta">
                Datos de ejemplo: la base aún no tiene prendas publicadas
              </p>
            )}

            {tienda.cargando ? (
              <EstadoTienda tipo="cargando" />
            ) : tienda.error ? (
              <EstadoTienda tipo="error" onReintentar={tienda.recargar} />
            ) : prendas.length === 0 ? (
              <EstadoTienda tipo="vacia" />
            ) : (
            <Vitrina
              ref={vitrina}
              prendas={fila}
              fisica={fisica}
              decisiones={decisiones}
              onDecidir={alDecidirEnVitrina}
              onTocar={(p) => {
                setFichaId(p.id)
                registrar(p.id, 'ficha')
              }}
              onRevisar={() => setRevision({ terminoFila: true })}
              mostrarTutorial={tutorial}
              onFinTutorial={finTutorial}
              pausada={Boolean(ficha || revision)}
            />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {revision && (
          <Revision
            key="revision"
            prendas={prendas}
            decisiones={decisiones}
            ajustes={ajustes}
            metodos={metodos}
            tasa={tasa}
            terminoFila={revision.terminoFila}
            hayPendientes={pendientes.length > 0}
            onDecidir={(id, tipo) => {
              decidir(id, tipo)
              registrar(id, tipo)
            }}
            onAbrir={(p) => {
              setFichaId(p.id)
              registrar(p.id, 'ficha')
            }}
            onVerPasadas={() => {
              olvidar('paso')
              setRevision(null)
            }}
            onCerrar={() => setRevision(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ficha && (
          <Ficha
            key={ficha.id}
            prenda={ficha}
            decision={decisiones[ficha.id]}
            ajustes={ajustes}
            metodos={metodos}
            tasa={tasa}
            onDecidir={alDecidirEnFicha}
            onCerrar={() => setFichaId(null)}
          />
        )}
      </AnimatePresence>

      {conPanelFisica && fase === 'vitrina' && <PanelFisica fisica={fisica} onCambio={setFisica} />}
    </main>
  )
}
