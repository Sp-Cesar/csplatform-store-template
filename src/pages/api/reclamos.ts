// POST /api/reclamos → registra un reclamo o queja en CSPlatform (web_registrar_reclamo).
// Es la única escritura de la web, exigida por el Libro de Reclamaciones. Núcleo compartido: no editar por cliente.
import type { APIRoute } from 'astro'
import { leerJson, limitePorVisitante, mismoOrigen, respuestaJson } from '../../lib/api'
import { ErrorBackend } from '../../lib/backend'
import { backend, reportarError } from '../../lib/conexion'
import { validarReclamo } from '../../lib/reclamo'
import { sitio } from '../../lib/sitio'

/** 5 reclamos por hora por visitante: suficiente para una persona, frena el spam. En modo demo (pruebas) es más alto. */
const limitar = limitePorVisitante({ maximo: sitio.modoDemo ? 500 : 5, ventanaMs: 60 * 60_000 })

export const POST: APIRoute = async ({ request, url, clientAddress }) => {
  if (!mismoOrigen(request, url)) return respuestaJson({ error: 'origen-no-permitido' }, 403)
  const bloqueo = limitar(clientAddress)
  if (bloqueo) return bloqueo

  const datos = (await leerJson(request, 16_384)) as Record<string, unknown> | null
  if (!datos) return respuestaJson({ error: 'datos-invalidos' }, 400)
  // Campo trampa: invisible para personas; si viene lleno, es un bot.
  if (typeof datos.trampa === 'string' && datos.trampa !== '') return respuestaJson({ error: 'datos-invalidos' }, 400)

  const validacion = validarReclamo(datos)
  if (!validacion.ok) return respuestaJson({ error: 'datos-invalidos', errores: validacion.errores }, 422)

  try {
    if (!(await backend().tienda())) return respuestaJson({ error: 'tienda-no-disponible' }, 503)
    return respuestaJson(await backend().registrarReclamo(validacion.reclamo), 201)
  } catch (e) {
    // 404: el backend todavía no tiene web_registrar_reclamo.
    const sinFuncion = e instanceof ErrorBackend && e.estado === 404
    await reportarError(e, { endpoint: '/api/reclamos', sinFuncion })
    return respuestaJson({ error: sinFuncion ? 'reclamos-no-habilitados' : 'backend-no-disponible' }, 503)
  }
}
