import { motion } from 'motion/react'

const TEXTOS = {
  cargando: { titulo: 'Abriendo el closet…', cuerpo: null },
  error: {
    titulo: 'No pudimos abrir el closet',
    cuerpo: 'Revisa tu conexión a internet e intenta de nuevo.',
  },
  vacia: {
    titulo: 'Pronto habrá piezas nuevas',
    cuerpo: 'Silmar está preparando su closet. Vuelve en unos días.',
  },
}

/** Lo que ocupa el lugar de la vitrina mientras carga, si falla o si no hay prendas */
export default function EstadoTienda({ tipo, onReintentar }) {
  const { titulo, cuerpo } = TEXTOS[tipo]
  return (
    <section className="flex w-full flex-1 flex-col items-center" aria-live="polite">
      <motion.div
        className="flex w-[min(86vw,400px)] flex-col items-center justify-center gap-3 border border-champan bg-superficie px-8 text-center"
        style={{ aspectRatio: '3 / 4', borderRadius: '999px 999px 10px 10px' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: tipo === 'cargando' ? [0.55, 1, 0.55] : 1 }}
        transition={tipo === 'cargando' ? { duration: 1.8, repeat: Infinity } : { duration: 0.3 }}
      >
        <p className="m-0 font-firma text-5xl leading-none">{titulo}</p>
        {cuerpo && <p className="m-0 max-w-[26ch] text-sm text-tinta-suave">{cuerpo}</p>}
        {tipo === 'error' && (
          <button
            type="button"
            onClick={onReintentar}
            className="mt-2 rounded-full bg-tinta px-6 py-2.5 text-sm font-medium text-fondo"
          >
            Intentar de nuevo
          </button>
        )}
      </motion.div>
    </section>
  )
}
