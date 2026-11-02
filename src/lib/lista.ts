// Lista de productos del comprador ("carrito"), guardada en el navegador con la clave lista:{slug}.
// Núcleo compartido: no editar por cliente.
// Las funciones puras trabajan sobre arreglos; el guardado está aparte para poder probarlas.

import type { Disponibilidad } from './tipos'

export interface ElementoLista {
  sku: string
  nombre: string
  /** Último precio conocido. Se refresca con web_disponibilidad al abrir la lista. */
  precio: number
  cantidad: number
}

export type Cambio =
  | { tipo: 'precio'; sku: string; nombre: string; antes: number; ahora: number }
  | { tipo: 'agotado'; sku: string; nombre: string }
  | { tipo: 'retirado'; sku: string; nombre: string }

export const CANTIDAD_MAXIMA = 99

/** Evento que se emite en window cada vez que cambia la lista, para que las islas se sincronicen. */
export const EVENTO_LISTA = 'lista:cambio'

const limitarCantidad = (n: number) => Math.min(Math.max(Math.trunc(n) || 0, 0), CANTIDAD_MAXIMA)

export function agregar(lista: ElementoLista[], producto: Omit<ElementoLista, 'cantidad'>, cantidad = 1): ElementoLista[] {
  const existente = lista.find((e) => e.sku === producto.sku)
  if (existente) return cambiarCantidad(lista, producto.sku, existente.cantidad + cantidad)
  const n = limitarCantidad(cantidad)
  return n > 0 ? [...lista, { ...producto, cantidad: n }] : lista
}

/** Cantidad 0 quita el producto. */
export function cambiarCantidad(lista: ElementoLista[], sku: string, cantidad: number): ElementoLista[] {
  const n = limitarCantidad(cantidad)
  if (n === 0) return quitar(lista, sku)
  return lista.map((e) => (e.sku === sku ? { ...e, cantidad: n } : e))
}

export function quitar(lista: ElementoLista[], sku: string): ElementoLista[] {
  return lista.filter((e) => e.sku !== sku)
}

export function totalLista(lista: ElementoLista[]): number {
  return Math.round(lista.reduce((suma, e) => suma + e.precio * e.cantidad, 0) * 100) / 100
}

export function unidades(lista: ElementoLista[]): number {
  return lista.reduce((suma, e) => suma + e.cantidad, 0)
}

/**
 * Aplica los datos frescos del backend. Actualiza nombre y precio, quita lo agotado o retirado
 * de la web y devuelve los cambios para avisar al comprador.
 */
export function refrescar(
  lista: ElementoLista[],
  frescos: Disponibilidad[],
): { lista: ElementoLista[]; cambios: Cambio[] } {
  const porSku = new Map(frescos.map((f) => [f.sku, f]))
  const cambios: Cambio[] = []
  const nueva: ElementoLista[] = []
  for (const e of lista) {
    const f = porSku.get(e.sku)
    if (!f) {
      cambios.push({ tipo: 'retirado', sku: e.sku, nombre: e.nombre })
    } else if (!f.disponible) {
      cambios.push({ tipo: 'agotado', sku: e.sku, nombre: f.nombre })
    } else {
      if (f.precio !== e.precio) cambios.push({ tipo: 'precio', sku: e.sku, nombre: f.nombre, antes: e.precio, ahora: f.precio })
      nueva.push({ ...e, nombre: f.nombre, precio: f.precio })
    }
  }
  return { lista: nueva, cambios }
}

// --- Guardado en el navegador ---

const clave = (slug: string) => `lista:${slug}`

function esElemento(v: unknown): v is ElementoLista {
  const e = v as ElementoLista
  return (
    !!e &&
    typeof e.sku === 'string' &&
    typeof e.nombre === 'string' &&
    typeof e.precio === 'number' &&
    Number.isFinite(e.precio) &&
    typeof e.cantidad === 'number' &&
    e.cantidad > 0
  )
}

/** Lee la lista. Devuelve [] si no hay almacenamiento (modo privado, servidor) o el dato está dañado. */
export function leerLista(slug: string, almacen: Storage | undefined = globalThis.localStorage): ElementoLista[] {
  try {
    const crudo = almacen?.getItem(clave(slug))
    if (!crudo) return []
    const datos: unknown = JSON.parse(crudo)
    return Array.isArray(datos)
      ? datos.filter(esElemento).map((e) => ({ ...e, cantidad: limitarCantidad(e.cantidad) || 1 }))
      : []
  } catch {
    return []
  }
}

/** Guarda la lista y avisa a las demás islas. Si el navegador bloquea el guardado, la lista sigue en memoria. */
export function guardarLista(slug: string, lista: ElementoLista[], almacen: Storage | undefined = globalThis.localStorage) {
  try {
    if (lista.length === 0) almacen?.removeItem(clave(slug))
    else almacen?.setItem(clave(slug), JSON.stringify(lista))
  } catch {
    // Sin almacenamiento disponible.
  }
  globalThis.dispatchEvent?.(new CustomEvent(EVENTO_LISTA, { detail: lista }))
}
