// Formatos de presentación compartidos. Núcleo: no editar por cliente.

import type { Especificaciones } from './tipos'

/** 2500 -> "S/ 2,500.00". Se arma a mano para que no dependa del idioma del servidor o del navegador. */
export function formatearSoles(monto: number): string {
  const centimos = Math.round((Number.isFinite(monto) ? monto : 0) * 100)
  const signo = centimos < 0 ? '-' : ''
  const absoluto = Math.abs(centimos)
  const enteros = Math.floor(absoluto / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const decimales = (absoluto % 100).toString().padStart(2, '0')
  return `${signo}S/ ${enteros}.${decimales}`
}

/** Convierte las especificaciones (jsonb libre) en filas [nombre, valor] para mostrarlas. */
export function especificacionesComoFilas(especificaciones: Especificaciones): [string, string][] {
  if (!especificaciones) return []
  const texto = (v: unknown) => (v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v))
  if (Array.isArray(especificaciones)) {
    return especificaciones.flatMap((item): [string, string][] => {
      if (item && typeof item === 'object' && 'nombre' in item) {
        const { nombre, valor } = item as { nombre: unknown; valor?: unknown }
        return [[texto(nombre), texto(valor)]]
      }
      return []
    })
  }
  return Object.entries(especificaciones)
    .map(([clave, valor]): [string, string] => [clave, texto(valor)])
    .filter(([, valor]) => valor !== '')
}
