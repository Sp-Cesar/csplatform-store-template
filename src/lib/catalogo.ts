// Lee y arma las direcciones del catálogo (/productos?q=&categoria=&marca=&orden=&pagina=).
// Núcleo compartido: no editar por cliente.

import { ORDENES, PRODUCTOS_POR_PAGINA, type OrdenProductos, type ParametrosProductos } from './tipos'

export interface FiltrosCatalogo {
  q: string
  categoria: string
  marca: string
  orden: OrdenProductos
  pagina: number
}

export const NOMBRES_ORDEN: Record<OrdenProductos, string> = {
  nombre: 'Nombre (A-Z)',
  precio_asc: 'Precio: menor a mayor',
  precio_desc: 'Precio: mayor a menor',
  recientes: 'Más recientes',
}

const LARGO_BUSQUEDA = 80

export function leerFiltros(busqueda: URLSearchParams): FiltrosCatalogo {
  const orden = busqueda.get('orden') as OrdenProductos
  const pagina = Number.parseInt(busqueda.get('pagina') ?? '', 10)
  return {
    q: (busqueda.get('q') ?? '').trim().slice(0, LARGO_BUSQUEDA),
    categoria: busqueda.get('categoria') ?? '',
    marca: busqueda.get('marca') ?? '',
    orden: ORDENES.includes(orden) ? orden : 'nombre',
    pagina: Number.isFinite(pagina) && pagina > 0 ? Math.min(pagina, 10_000) : 1,
  }
}

export function parametrosDeFiltros(f: FiltrosCatalogo, porPagina = PRODUCTOS_POR_PAGINA): ParametrosProductos {
  return {
    busqueda: f.q || null,
    categoria: f.categoria || null,
    marca: f.marca || null,
    orden: f.orden,
    limite: porPagina,
    desde: (f.pagina - 1) * porPagina,
  }
}

/** Dirección del catálogo con los filtros dados. Omite los valores por defecto para que quede corta. */
export function urlCatalogo(f: Partial<FiltrosCatalogo>): string {
  const p = new URLSearchParams()
  if (f.q) p.set('q', f.q)
  if (f.categoria) p.set('categoria', f.categoria)
  if (f.marca) p.set('marca', f.marca)
  if (f.orden && f.orden !== 'nombre') p.set('orden', f.orden)
  if (f.pagina && f.pagina > 1) p.set('pagina', String(f.pagina))
  const texto = p.toString()
  return texto ? `/productos?${texto}` : '/productos'
}

export function totalPaginas(total: number, porPagina = PRODUCTOS_POR_PAGINA): number {
  return Math.max(1, Math.ceil(total / porPagina))
}

export function rutaProducto(sku: string): string {
  return `/productos/${encodeURIComponent(sku)}`
}
