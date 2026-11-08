import { useState } from 'react'
import { motion } from 'motion/react'

/**
 * La prenda colgada dentro de su arco, como en los nichos de la tienda.
 * El gancho es dibujado (champán) y es igual para todas las prendas;
 * la foto llega ya recortada y con fondo transparente.
 */
export default function ArcoPrenda({ foto, alt, vendida = false, className = '' }) {
  // Si la prenda llega ya vendida, el sello está quieto; si se vende mientras se mira, cae
  const [vendidaAlAparecer] = useState(vendida)
  return (
    <figure className={`relative m-0 w-full ${className}`}>
      <div
        className="relative w-full overflow-hidden border border-champan bg-superficie"
        style={{ aspectRatio: '3 / 4', borderRadius: '999px 999px 10px 10px' }}
      >
        <Gancho />
        <img
          src={foto}
          alt={alt}
          draggable={false}
          decoding="async"
          className="absolute inset-x-[6%] bottom-[5%] top-[13%] h-[82%] w-[88%] select-none object-contain object-top"
          style={{ filter: 'drop-shadow(0 14px 16px var(--sombra-prenda))' }}
        />
        {vendida && <SelloVendido enVivo={!vendidaAlAparecer} />}
      </div>
      <div className="acanalado mx-[4%] h-4 rounded-b-md" aria-hidden="true" />
    </figure>
  )
}

export function Gancho() {
  return (
    <svg
      viewBox="0 0 120 60"
      className="absolute left-1/2 top-[3%] w-[30%] -translate-x-1/2"
      aria-hidden="true"
      fill="none"
      stroke="var(--champan)"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M60 22 V16 a7 7 0 1 1 7 -7" />
      <path d="M60 22 L10 46 Q6 48 10 50 H110 Q114 48 110 46 Z" />
    </svg>
  )
}

/** Sello de VENDIDO. En vivo cae desde arriba, golpea y deja una marca de tinta. */
export function SelloVendido({ enVivo = false }) {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      {enVivo && (
        <motion.span
          className="absolute h-28 w-28 rounded-full border-2 border-oro-viejo"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: [0.4, 1.9], opacity: [0, 0.55, 0] }}
          transition={{ duration: 0.7, delay: 0.32, ease: 'easeOut' }}
        />
      )}
      <motion.span
        className="etiqueta rounded-sm border-2 border-oro-viejo px-4 py-1.5 text-lg font-medium text-oro-viejo"
        style={{
          background: 'color-mix(in srgb, var(--fondo) 82%, transparent)',
          letterSpacing: '0.3em',
        }}
        initial={enVivo ? { scale: 2.6, rotate: -28, opacity: 0, y: -40 } : false}
        animate={{ scale: 1, rotate: -12, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 520, damping: 17, mass: 0.9, delay: enVivo ? 0.05 : 0 }}
        role={enVivo ? 'status' : undefined}
      >
        Vendido
      </motion.span>
    </div>
  )
}
