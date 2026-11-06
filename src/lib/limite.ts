// Límite de peticiones por visitante (ventana deslizante en memoria). Núcleo compartido: no editar por cliente.
// En Vercel cada instancia tiene su propia memoria: frena abusos de un visitante, pero no reemplaza
// una regla de firewall del proyecto (ver PLANTILLA.md, sección 3).

export interface OpcionesLimite {
  /** Peticiones permitidas por ventana. */
  maximo: number
  ventanaMs: number
  /** Claves distintas que se recuerdan como máximo, para no crecer sin fin. */
  capacidad?: number
}

export type ResultadoLimite = { ok: true } | { ok: false; reintentarEnSegundos: number }

export function crearLimitador({ maximo, ventanaMs, capacidad = 10_000 }: OpcionesLimite) {
  const registros = new Map<string, number[]>()

  return function permitir(clave: string, ahora = Date.now()): ResultadoLimite {
    const recientes = (registros.get(clave) ?? []).filter((t) => ahora - t < ventanaMs)
    if (recientes.length >= maximo) {
      registros.set(clave, recientes)
      return { ok: false, reintentarEnSegundos: Math.max(1, Math.ceil((recientes[0] + ventanaMs - ahora) / 1000)) }
    }
    recientes.push(ahora)
    registros.delete(clave) // Reinsertar deja las claves más usadas al final del Map.
    registros.set(clave, recientes)
    if (registros.size > capacidad) registros.delete(registros.keys().next().value!)
    return { ok: true }
  }
}
