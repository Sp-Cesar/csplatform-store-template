// Llamadas tipadas a las funciones web_* del backend (Supabase, RPC por HTTPS).
// Núcleo compartido: no editar por cliente.
// La web solo lee, con una excepción legal: registrar reclamos (web_registrar_reclamo).

import {
  LIMITE_PRODUCTOS,
  LIMITE_SKUS,
  ORDENES,
  PRODUCTOS_POR_PAGINA,
  type Disponibilidad,
  type Filtros,
  type PaginaProductos,
  type ParametrosProductos,
  type ProductoDetalle,
  type Tienda,
} from './tipos'
import type { ConstanciaReclamo, Reclamo } from './reclamo'

/**
 * Lo que la web puede pedir al backend. Lo implementan el backend real y el modo demo.
 * Todo es lectura salvo registrarReclamo: la única escritura, exigida por ley (Libro de Reclamaciones).
 */
export interface Backend {
  tienda(): Promise<Tienda | null>
  filtros(): Promise<Filtros>
  productos(parametros?: ParametrosProductos): Promise<PaginaProductos>
  producto(sku: string): Promise<ProductoDetalle | null>
  disponibilidad(skus: string[]): Promise<Disponibilidad[]>
  /** Llama a web_registrar_reclamo. Solo desde el servidor, con el reclamo ya validado. */
  registrarReclamo(reclamo: Reclamo): Promise<ConstanciaReclamo>
}

export class ErrorBackend extends Error {
  constructor(
    mensaje: string,
    readonly estado?: number,
  ) {
    super(mensaje)
    this.name = 'ErrorBackend'
  }
}

export interface OpcionesSupabase {
  url: string
  anonKey: string
  slug: string
  /** Milisegundos antes de cancelar una llamada. */
  espera?: number
  /** Para pruebas. */
  fetch?: typeof fetch
}

const PATRON_SLUG = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/

export function slugValido(slug: string): boolean {
  return PATRON_SLUG.test(slug)
}

/** Ajusta los parámetros a los límites del contrato y les pone los nombres de la función SQL. */
export function normalizarParametros(p: ParametrosProductos = {}) {
  const busqueda = p.busqueda?.trim() || null
  const orden = p.orden && ORDENES.includes(p.orden) ? p.orden : 'nombre'
  const limite = Math.min(Math.max(Math.trunc(p.limite ?? PRODUCTOS_POR_PAGINA), 1), LIMITE_PRODUCTOS)
  const desde = Math.max(Math.trunc(p.desde ?? 0), 0)
  return {
    p_busqueda: busqueda,
    p_categoria: p.categoria || null,
    p_marca: p.marca || null,
    p_orden: orden,
    p_limite: limite,
    p_desde: desde,
  }
}

/** Quita vacíos y repetidos y respeta el máximo de SKU por llamada. */
export function normalizarSkus(skus: string[]): string[] {
  return [...new Set(skus.map((s) => s.trim()).filter(Boolean))].slice(0, LIMITE_SKUS)
}

export function crearBackendSupabase(opciones: OpcionesSupabase): Backend {
  const { anonKey, slug, espera = 8000 } = opciones
  const url = opciones.url.replace(/\/+$/, '')
  const pedir = opciones.fetch ?? fetch

  if (!url || !anonKey) throw new ErrorBackend('Falta SUPABASE_URL o SUPABASE_ANON_KEY')
  if (!slugValido(slug)) throw new ErrorBackend(`PUBLIC_TIENDA_SLUG no es válido: "${slug}"`)

  async function rpc<T>(funcion: string, cuerpo: Record<string, unknown>): Promise<T> {
    let res: Response
    try {
      res = await pedir(`${url}/rest/v1/rpc/${funcion}`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_slug: slug, ...cuerpo }),
        signal: AbortSignal.timeout(espera),
      })
    } catch (e) {
      throw new ErrorBackend(`No se pudo conectar con el backend (${funcion}): ${(e as Error).message}`)
    }
    if (!res.ok) {
      const detalle = await res.text().catch(() => '')
      throw new ErrorBackend(`El backend respondió ${res.status} en ${funcion}: ${detalle}`, res.status)
    }
    return (await res.json()) as T
  }

  return {
    tienda: () => rpc<Tienda | null>('web_tienda', {}),
    filtros: async () => (await rpc<Filtros | null>('web_filtros', {})) ?? { categorias: [], marcas: [] },
    productos: async (parametros) =>
      (await rpc<PaginaProductos | null>('web_productos', normalizarParametros(parametros))) ?? { total: 0, filas: [] },
    producto: (sku) => rpc<ProductoDetalle | null>('web_producto', { p_sku: sku.trim() }),
    disponibilidad: async (skus) => {
      const lista = normalizarSkus(skus)
      if (lista.length === 0) return []
      return (await rpc<Disponibilidad[] | null>('web_disponibilidad', { p_skus: lista })) ?? []
    },
    registrarReclamo: async (reclamo) => {
      const constancia = await rpc<ConstanciaReclamo | null>('web_registrar_reclamo', { p_reclamo: reclamo })
      if (!constancia?.codigo) throw new ErrorBackend('web_registrar_reclamo no devolvió un código')
      return constancia
    },
  }
}
