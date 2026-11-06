// Ayudas para los endpoints propios de la web (/api/*). Núcleo compartido: no editar por cliente.
// El navegador nunca habla con el backend: llama a estos endpoints y el servidor responde con la clave privada.

import { crearLimitador, type OpcionesLimite } from './limite'

export const SIN_CACHE_API = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }

export function respuestaJson(cuerpo: unknown, estado = 200, cabeceras: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { ...SIN_CACHE_API, ...cabeceras } })
}

/**
 * Rechaza peticiones que vienen de otro sitio (evita que usen esta web como intermediario).
 * Los navegadores envían Origin en todo POST; sin Origin (herramientas de servidor) se exige el mismo host.
 */
export function mismoOrigen(request: Request, url: URL): boolean {
  const origen = request.headers.get('origin')
  if (origen) return origen === url.origin
  const referer = request.headers.get('referer')
  return referer ? new URL(referer).origin === url.origin : false
}

/** Lee un JSON con tamaño máximo. null si no es JSON válido o es muy grande. */
export async function leerJson(request: Request, maximoBytes: number): Promise<unknown | null> {
  const largo = Number(request.headers.get('content-length') ?? '0')
  if (largo > maximoBytes) return null
  const texto = await request.text()
  if (texto.length > maximoBytes) return null
  try {
    return JSON.parse(texto)
  } catch {
    return null
  }
}

/** Limitador por IP listo para un endpoint: devuelve una Response 429 si se pasó del límite. */
export function limitePorVisitante(opciones: OpcionesLimite) {
  const permitir = crearLimitador(opciones)
  return (ip: string | undefined): Response | null => {
    const r = permitir(ip || 'desconocido')
    if (r.ok) return null
    return respuestaJson({ error: 'demasiadas-peticiones' }, 429, { 'Retry-After': String(r.reintentarEnSegundos) })
  }
}
