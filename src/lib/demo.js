// Datos de ejemplo para las fases sin base de datos. Precios provisionales.
export const prendasDemo = [
  {
    id: 'demo-1',
    ref: 1,
    nombre: 'Chaqueta de jean estampada',
    tipo: 'chaqueta',
    marca: null,
    talla: 'M',
    color: 'Azul',
    estado: 'nueva_sin_etiqueta',
    medidas: { busto: 54, largo: 60, manga: 58 },
    descripcion: 'Jean grueso con estampado de eslabones y botones dorados.',
    precio_usd: 25,
    precio_original_usd: null,
    foto: '/demo/chaqueta-denim.webp',
    vendida: false,
  },
  {
    id: 'demo-2',
    ref: 2,
    nombre: 'Pantalón ancho de felpa',
    tipo: 'pantalon',
    marca: null,
    talla: '6',
    color: 'Topo',
    estado: 'usada_como_nueva',
    medidas: {},
    descripcion: 'Felpa suave, cintura elástica, bolsillos laterales y costura al frente.',
    precio_usd: 15,
    precio_original_usd: null,
    foto: '/demo/pantalon-taupe.webp',
    vendida: false,
  },
  {
    id: 'demo-3',
    ref: 3,
    nombre: 'Blusa de gasa con bolsillos',
    tipo: 'blusa',
    marca: 'Express',
    talla: 'S',
    color: 'Vino',
    estado: 'nueva_con_etiqueta',
    medidas: {},
    descripcion: 'Gasa liviana, mangas que se recogen con botón.',
    precio_usd: 18,
    precio_original_usd: 45,
    foto: '/demo/blusa-express.webp',
    vendida: true,
  },
]

export const ajustesDemo = {
  whatsapp: null, // se lee de la base en la fase 5
  titulo: 'El Closet de Silmar',
  subtitulo: 'Ropa que te va a encantar',
  ciudad: 'Barquisimeto',
  modo_entrega: 'gratis',
  costo_entrega_fijo_usd: 0,
}

export const metodosDemo = [
  { nombre: 'Pago Móvil', descuento_pct: 0, activo: true },
  { nombre: 'Transferencia', descuento_pct: 0, activo: true },
  { nombre: 'Binance', descuento_pct: 10, activo: true },
]

// Tasa de ejemplo; la real llega con la fase 8
export const tasaDemo = { tasa: 510.7873, publicada_en: '2026-11-06', fuente: 'ejemplo' }
