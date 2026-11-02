// Ayudas para las páginas del servidor. Núcleo compartido: no editar por cliente.

import { CACHE_PUBLICA, SIN_CACHE, type EstadoTienda } from './conexion'

/** Respuesta de Astro (Astro.response) en lo que se usa aquí. */
interface RespuestaAstro {
  status?: number
  headers: Headers
}

/** Caché pública si la tienda está disponible; si no, 503 sin caché para que vuelva apenas se reactive. */
export function aplicarCache(respuesta: RespuestaAstro, estado: EstadoTienda) {
  if (estado.estado === 'ok') {
    respuesta.headers.set('Cache-Control', CACHE_PUBLICA)
  } else {
    respuesta.status = 503
    respuesta.headers.set('Cache-Control', SIN_CACHE)
  }
}

export type Resultado<T> = { ok: true; valor: T } | { ok: false; valor: T }

/**
 * Ejecuta una llamada al backend sin romper la página: si falla, registra el error y devuelve
 * el respaldo con ok = false para mostrar un aviso. La respuesta no se cachea.
 */
export async function intentar<T>(respuesta: RespuestaAstro, llamada: () => Promise<T>, respaldo: T): Promise<Resultado<T>> {
  try {
    return { ok: true, valor: await llamada() }
  } catch (e) {
    console.error(e)
    respuesta.headers.set('Cache-Control', SIN_CACHE)
    return { ok: false, valor: respaldo }
  }
}
