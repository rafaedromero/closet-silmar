// Service worker mínimo del panel: permite instalarlo como app.
// No guarda nada en caché a propósito: el panel siempre muestra datos frescos.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
