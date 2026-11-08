# El Closet de Silmar

Catálogo de ropa con vitrina deslizable, sello de vendido en tiempo real,
pedido por WhatsApp y panel de administración instalable.

**Stack:** React 19 · Vite · Tailwind CSS 4 · Motion · Supabase · Vercel

## Arrancar en tu computadora

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev
```

Abre la dirección que aparece (normalmente http://localhost:5173).
Para verlo en el teléfono, conéctalo a la misma red wifi y abre la
dirección "Network" que muestra la terminal.

Sin Supabase configurado, el catálogo usa las prendas de ejemplo de
`src/lib/demo.js`.

## Conectar Supabase

1. Silmar crea su proyecto en supabase.com e invita a Rafael con rol **Developer**.
2. En el SQL Editor, ejecutar `supabase/migrations/0001_esquema_inicial.sql`.
3. Copiar `.env.example` como `.env.local` y llenar la URL y la clave pública
   (Project Settings → API).
4. Cuando Silmar inicie sesión por primera vez con el enlace mágico, agregarla
   como administradora desde el SQL Editor:

   ```sql
   insert into public.administradoras (user_id)
   select id from auth.users where email = 'correo-de-silmar@ejemplo.com';
   ```

## Procesar fotos

Requiere Python 3.10 o superior.

```bash
pip install -r scripts/requirements.txt
python scripts/procesar_fotos.py fotos/originales fotos/procesadas
```

Quita el fondo y el gancho, centra la prenda en un lienzo 3:4 y exporta WebP.
La primera vez descarga el modelo de recorte (unos 180 MB).
Revisa cada resultado antes de subirlo: si queda un resto del gancho, se limpia a mano.

## Panel de Silmar

Vive en `/panel` (por ejemplo http://localhost:5173/panel). Entrada con enlace mágico,
solo para correos registrados en `administradoras`. Se instala en el teléfono como app.

Para probarlo sin iniciar sesión: http://localhost:5173/panel?demo (solo en desarrollo; nada se guarda).

### Fotos que Silmar sube desde el panel

Quedan como "Foto por procesar" en un bucket privado. Para procesarlas:

```bash
python scripts/procesar_pendientes.py              # procesa y sube
python scripts/procesar_pendientes.py --revisar    # solo guarda en fotos/pendientes para retocar
python scripts/procesar_pendientes.py --subir-revisadas
```

## Estructura

```
src/
  components/   catálogo: intro, vitrina, tarjeta, ficha, selección
  panel/        panel de Silmar: acceso, prendas, editor, ajustes
  lib/          cliente de Supabase y datos de ejemplo
  index.css     tokens de diseño (paleta día y noche, Allison + Poppins)
supabase/
  migrations/   esquema, permisos, almacenamiento y tiempo real
scripts/        procesamiento de fotos
fotos/          originales y procesadas (no se suben al repositorio)
```

## Fases

1. ~~Base del proyecto~~
2. ~~Prototipo de la vitrina con slingshot~~
3. ~~Intro con firma animada y tutorial~~
4. ~~Ficha, selección y WhatsApp~~
5. ~~Fotos y datos reales~~
6. ~~Panel de Silmar (enlace mágico, instalable)~~
7. Sello de vendido en tiempo real
8. Tasa BCV automática
9. Estadísticas
10. Pruebas en teléfonos y publicación
