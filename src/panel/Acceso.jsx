import { useState } from 'react'
import { motion } from 'motion/react'
import { Boton, Campo, claseEntrada } from './ui'

/** Entrada al panel con enlace mágico: sin contraseñas */
export default function Acceso({ api }) {
  const [correo, setCorreo] = useState('')
  const [estado, setEstado] = useState('escribiendo') // escribiendo | enviando | enviado
  const [error, setError] = useState(null)
  const [codigo, setCodigo] = useState('')
  const [verificando, setVerificando] = useState(false)

  async function entrarConCodigo(e) {
    e.preventDefault()
    const limpio = codigo.replace(/\D/g, '')
    if (limpio.length < 6) {
      setError('Escribe el código completo que llegó en el correo')
      return
    }
    setVerificando(true)
    setError(null)
    try {
      await api.verificarCodigo(correo.trim().toLowerCase(), limpio)
    } catch (err) {
      setError(err.message)
    } finally {
      setVerificando(false)
    }
  }

  async function enviar(e) {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(correo.trim())) {
      setError('Escribe un correo completo, por ejemplo silmar@gmail.com')
      return
    }
    setEstado('enviando')
    setError(null)
    try {
      await api.enviarEnlace(correo.trim().toLowerCase())
      setEstado('enviado')
    } catch (err) {
      setError(err.message)
      setEstado('escribiendo')
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
      <div
        className="flex w-full max-w-xs flex-col items-center gap-2 border border-champan bg-superficie/60 px-6 pb-8 pt-14 text-center"
        style={{ borderRadius: '999px 999px 12px 12px' }}
      >
        <p className="m-0 font-firma text-6xl leading-none">Mi Closet</p>
        <p className="etiqueta m-0 text-[11px] text-tinta-suave">Panel de Silmar</p>
      </div>
      <div className="acanalado mb-8 h-4 w-full max-w-[18rem] rounded-b-md" aria-hidden="true" />

      {estado === 'enviado' ? (
        <motion.div
          className="flex max-w-xs flex-col items-center gap-3 text-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="m-0 text-lg font-medium">Revisa tu correo</p>
          <p className="m-0 text-sm text-tinta-suave">
            Te enviamos un código a <strong className="text-tinta">{correo}</strong>. Escríbelo aquí para entrar.
          </p>
          <form onSubmit={entrarConCodigo} className="flex w-full flex-col gap-3" noValidate>
            <Campo etiqueta="Código" htmlFor="codigo" error={error}>
              <input
                id="codigo"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                placeholder="123456"
                value={codigo}
                onChange={(e) => {
                  setCodigo(e.target.value)
                  setError(null)
                }}
                className={`${claseEntrada} text-center text-2xl tracking-[0.4em] tabular-nums`}
                autoFocus
              />
            </Campo>
            <Boton type="submit" variante="primario" cargando={verificando} textoCargando="Entrando…">
              Entrar
            </Boton>
          </form>
          <p className="m-0 text-xs text-tinta-suave">También puedes tocar el enlace del correo si lo abres en este navegador.</p>
          <Boton variante="fantasma" onClick={() => setEstado('escribiendo')}>
            Usar otro correo
          </Boton>
        </motion.div>
      ) : (
        <form onSubmit={enviar} className="flex w-full max-w-xs flex-col gap-4" noValidate>
          <Campo etiqueta="Tu correo" htmlFor="correo" error={error}>
            <input
              id="correo"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="silmar@gmail.com"
              value={correo}
              onChange={(e) => {
                setCorreo(e.target.value)
                setError(null)
              }}
              className={claseEntrada}
            />
          </Campo>
          <Boton type="submit" variante="primario" cargando={estado === 'enviando'} textoCargando="Enviando…">
            Enviarme el código
          </Boton>
        </form>
      )}
    </div>
  )
}
