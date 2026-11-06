// Llamadas del navegador a los endpoints propios de la web. Núcleo compartido: no editar por cliente.
// Solo para islas: no importa claves ni habla con el backend directamente.

import type { ConstanciaReclamo, Reclamo } from './reclamo'
import type { Disponibilidad } from './tipos'

export class ErrorApi extends Error {
  constructor(
    readonly codigo: string,
    readonly estado: number,
    /** Errores por campo (validación del Libro de Reclamaciones). */
    readonly errores?: Record<string, string>,
  ) {
    super(codigo)
    this.name = 'ErrorApi'
  }
}

async function enviar<T>(ruta: string, cuerpo: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(ruta, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    throw new ErrorApi('sin-conexion', 0)
  }
  const datos = await res.json().catch(() => null)
  if (!res.ok) throw new ErrorApi(datos?.error ?? 'error', res.status, datos?.errores)
  return datos as T
}

export const consultarDisponibilidad = (skus: string[]) => enviar<Disponibilidad[]>('/api/disponibilidad', { skus })

export const enviarReclamo = (reclamo: Reclamo & { trampa?: string }) => enviar<ConstanciaReclamo>('/api/reclamos', reclamo)
