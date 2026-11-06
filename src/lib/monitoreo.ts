// Reporte de errores del servidor. Núcleo compartido: no editar por cliente.
// Siempre escribe en los logs (Vercel). Si hay SENTRY_DSN, además envía el error a Sentry con su API HTTP
// (sin dependencias, solo desde el servidor). Nunca se envían datos personales: solo el error y etiquetas.

export interface OpcionesReportador {
  dsn?: string
  entorno?: string
  /** Para pruebas. */
  fetch?: typeof fetch
  /** Milisegundos máximos para enviar a Sentry. */
  espera?: number
}

export type Contexto = Record<string, string | number | boolean | undefined>

interface Dsn {
  clave: string
  url: string
  proyecto: string
}

/** https://clave@o123.ingest.sentry.io/456 → partes. null si no es un DSN válido. */
export function leerDsn(dsn: string | undefined): Dsn | null {
  if (!dsn) return null
  try {
    const u = new URL(dsn)
    const proyecto = u.pathname.replace(/^\/+|\/+$/g, '')
    if (!u.username || !proyecto || !/^https?:$/.test(u.protocol)) return null
    return { clave: u.username, url: `${u.protocol}//${u.host}/api/${proyecto}/envelope/`, proyecto }
  } catch {
    return null
  }
}

/** Sobre (envelope) de Sentry con un solo evento de error. */
export function armarSobre(error: unknown, contexto: Contexto, dsn: string, entorno: string, ahora = new Date()): string {
  const e = error instanceof Error ? error : new Error(String(error))
  const idEvento = crypto.randomUUID().replace(/-/g, '')
  const evento = {
    event_id: idEvento,
    timestamp: ahora.toISOString(),
    platform: 'javascript',
    level: 'error',
    environment: entorno,
    logger: 'vitrina',
    exception: { values: [{ type: e.name, value: e.message.slice(0, 1000) }] },
    tags: Object.fromEntries(Object.entries(contexto).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])),
    extra: { stack: e.stack?.slice(0, 4000) },
  }
  return [
    JSON.stringify({ event_id: idEvento, sent_at: ahora.toISOString(), dsn }),
    JSON.stringify({ type: 'event' }),
    JSON.stringify(evento),
  ].join('\n')
}

export function crearReportador({ dsn, entorno = 'production', fetch: pedir = fetch, espera = 2000 }: OpcionesReportador = {}) {
  const destino = leerDsn(dsn)
  return async function reportarError(error: unknown, contexto: Contexto = {}): Promise<void> {
    console.error('[vitrina]', contexto, error)
    if (!destino || !dsn) return
    try {
      await pedir(destino.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${destino.clave}, sentry_client=csplatform-vitrina/1.0`,
        },
        body: armarSobre(error, contexto, dsn, entorno),
        signal: AbortSignal.timeout(espera),
      })
    } catch {
      // El monitoreo nunca debe romper la página.
    }
  }
}
