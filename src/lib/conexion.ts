// Crea el backend a partir de las variables de entorno del proyecto (las carga el dueño en Vercel).
// Núcleo compartido: no editar por cliente. Funciona en el servidor y en las islas del navegador.

import { crearBackendSupabase, type Backend } from './backend'
import { crearBackendDemo } from './demo'
import { VERSION_CONTRATO, type Tienda } from './tipos'

export const entorno = {
  supabaseUrl: import.meta.env.PUBLIC_SUPABASE_URL ?? '',
  anonKey: import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? '',
  slug: import.meta.env.PUBLIC_TIENDA_SLUG ?? '',
  sitioUrl: import.meta.env.PUBLIC_SITIO_URL ?? '',
  modoDemo: import.meta.env.PUBLIC_MODO_DEMO === 'true',
}

/** Slug de esta web. En modo demo puede quedar vacío. */
export const slugTienda = entorno.slug || (entorno.modoDemo ? 'demo' : '')

let instancia: Backend | undefined

export function backend(): Backend {
  instancia ??= entorno.modoDemo
    ? crearBackendDemo(slugTienda)
    : crearBackendSupabase({ url: entorno.supabaseUrl, anonKey: entorno.anonKey, slug: entorno.slug })
  return instancia
}

export type EstadoTienda =
  | { estado: 'ok'; tienda: Tienda }
  | { estado: 'no-disponible' }
  | { estado: 'error'; mensaje: string }

/**
 * Carga los datos de la tienda para el layout. "no-disponible" cuando la web está desactivada
 * o la empresa está bloqueada; "error" cuando no se pudo hablar con el backend.
 */
export async function cargarTienda(): Promise<EstadoTienda> {
  try {
    const tienda = await backend().tienda()
    if (!tienda) return { estado: 'no-disponible' }
    if (tienda.version_contrato > VERSION_CONTRATO) {
      console.warn(
        `El backend usa el contrato ${tienda.version_contrato} y esta web entiende el ${VERSION_CONTRATO}. Actualiza el núcleo lib/.`,
      )
    }
    return { estado: 'ok', tienda }
  } catch (e) {
    console.error(e)
    return { estado: 'error', mensaje: (e as Error).message }
  }
}

/** Caché en el CDN de Vercel: el precio y la disponibilidad se actualizan en menos de 60 s. */
export const CACHE_PUBLICA = 'public, s-maxage=60, stale-while-revalidate=300'
export const SIN_CACHE = 'no-store'
