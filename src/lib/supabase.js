import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY

// Mientras Silmar no tenga su proyecto, el catálogo funciona con datos de ejemplo.
export const supabase = url && clave ? createClient(url, clave) : null
