import { aBolivares, bs, conDescuento, fechaCorta, mejorDescuento, usd } from '../lib/dinero'

/** Precio en dólares, precio de tienda tachado, precio con el mejor descuento y monto en bolívares */
export default function Precios({ monto, original, metodos, tasa, grande = false }) {
  const promo = mejorDescuento(metodos)
  return (
    <div className="flex flex-col gap-1 tabular-nums">
      <div className="flex items-baseline gap-2">
        {original && (
          <span className="text-sm text-tinta-suave">
            En tienda <s>{usd(original)}</s>
          </span>
        )}
        <span className={`${grande ? 'text-2xl' : 'text-lg'} font-medium`}>{usd(monto)}</span>
      </div>
      {promo && (
        <p className="m-0 text-sm text-oro-viejo">
          Con {promo.nombre}: {usd(conDescuento(monto, promo.descuento_pct))}
        </p>
      )}
      {tasa?.tasa && (
        <p className="m-0 text-xs text-tinta-suave">
          {bs(aBolivares(monto, tasa.tasa))} · tasa BCV del {fechaCorta(tasa.publicada_en)}
        </p>
      )}
    </div>
  )
}
