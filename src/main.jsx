import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fuentes alojadas en el propio sitio: cargan sin depender de Google y funcionan sin conexión en el panel instalable
import '@fontsource/allison/latin-400.css'
import '@fontsource/poppins/latin-300.css'
import '@fontsource/poppins/latin-400.css'
import '@fontsource/poppins/latin-500.css'
import '@fontsource/poppins/latin-600.css'
import './index.css'
import { lazy, Suspense } from 'react'
import App from './App.jsx'

// El panel de Silmar vive en /panel y se descarga aparte: las clientas nunca lo cargan
const PanelApp = lazy(() => import('./panel/PanelApp.jsx'))
const enPanel = window.location.pathname.replace(/\/+$/, '') === '/panel'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {enPanel ? (
      <Suspense fallback={null}>
        <PanelApp />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
