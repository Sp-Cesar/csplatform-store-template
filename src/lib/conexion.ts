// Crea el backend a partir de las variables de entorno del proyecto (las carga el dueño en Vercel).
// Núcleo compartido: no editar por cliente.
// SOLO SERVIDOR: lee la clave del backend con astro:env/server. Si una isla lo importa, la compilación falla
// a propósito. Las islas usan clienteApi.ts (endpoints /api/*) y sitio.ts.

import { SENTRY_DSN, SUPABASE_ANON_KEY, SUPABASE_URL } from 'astro:env/server'
import { crearBackendSupabase, type Backend } from './backend'
import { crearBackendDemo } from './demo'
import { crearReportador } from './monitoreo'
import { sitio, slugTienda } from './sitio'
import { VERSION_CONTRATO, type Tienda } from './tipos'

/** Envía el error a los logs y, si hay SENTRY_DSN, a Sentry. */
export const reportarError = crearReportador({
  dsn: SENTRY_DSN,
  entorno: sitio.modoDemo ? 'demo' : (process.env.VERCEL_ENV ?? 'development'),
})

let instancia: Backend | undefined

export function backend(): Backend {
  instancia ??= sitio.modoDemo
    ? crearBackendDemo(slugTienda)
    : crearBackendSupabase({ url: SUPABASE_URL ?? '', anonKey: SUPABASE_ANON_KEY ?? '', slug: sitio.slug })
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
    await reportarError(e, { origen: 'cargarTienda' })
    return { estado: 'error', mensaje: (e as Error).message }
  }
}

/** Caché en el CDN de Vercel: el precio y la disponibilidad se actualizan en menos de 60 s. */
export const CACHE_PUBLICA = 'public, s-maxage=60, stale-while-revalidate=300'
export const SIN_CACHE = 'no-store'
