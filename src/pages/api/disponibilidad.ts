// POST /api/disponibilidad { skus: string[] } → Disponibilidad[]
// La isla Lista consulta precios y stock aquí; el servidor llama a web_disponibilidad con la clave privada.
// Núcleo compartido: no editar por cliente.
import type { APIRoute } from 'astro'
import { leerJson, limitePorVisitante, mismoOrigen, respuestaJson } from '../../lib/api'
import { backend, reportarError } from '../../lib/conexion'
import { LIMITE_SKUS } from '../../lib/tipos'

/** 30 consultas por minuto por visitante: de sobra para abrir la lista y enviar el pedido varias veces. */
const limitar = limitePorVisitante({ maximo: 30, ventanaMs: 60_000 })

export const POST: APIRoute = async ({ request, url, clientAddress }) => {
  if (!mismoOrigen(request, url)) return respuestaJson({ error: 'origen-no-permitido' }, 403)
  const bloqueo = limitar(clientAddress)
  if (bloqueo) return bloqueo

  const datos = (await leerJson(request, 8_192)) as { skus?: unknown } | null
  const skus = datos?.skus
  if (!Array.isArray(skus) || skus.length > LIMITE_SKUS || !skus.every((s) => typeof s === 'string' && s.length <= 64)) {
    return respuestaJson({ error: 'datos-invalidos' }, 400)
  }

  try {
    return respuestaJson(await backend().disponibilidad(skus))
  } catch (e) {
    await reportarError(e, { endpoint: '/api/disponibilidad' })
    return respuestaJson({ error: 'backend-no-disponible' }, 502)
  }
}
