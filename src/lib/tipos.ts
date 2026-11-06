// Tipos del contrato de lectura con el backend (funciones web_* de CSPlatform).
// Núcleo compartido: no editar por cliente. Ver plan-vitrina-web.md, sección 7.2.

/** Versión del contrato que entiende esta plantilla. */
export const VERSION_CONTRATO = 1

/** Respuesta de web_tienda. null si la web no existe, está inactiva o la empresa está bloqueada. */
export interface Tienda {
  version_contrato: number
  slug: string
  nombre: string
  logo_url: string | null
  whatsapp: string | null
  telefono: string | null
  direccion: string | null
  email: string | null
  sitio_web: string | null
  /** Datos del proveedor exigidos por el Libro de Reclamaciones. Opcionales: llegan cuando el backend los agregue. */
  razon_social?: string | null
  ruc?: string | null
}

export interface OpcionFiltro {
  id: string
  nombre: string
  /** Cantidad de productos publicados con esta opción. */
  total: number
}

/** Respuesta de web_filtros. */
export interface Filtros {
  categorias: OpcionFiltro[]
  marcas: OpcionFiltro[]
}

export type OrdenProductos = 'nombre' | 'precio_asc' | 'precio_desc' | 'recientes'

export const ORDENES: readonly OrdenProductos[] = ['nombre', 'precio_asc', 'precio_desc', 'recientes']

/** Parámetros de web_productos (sin el slug, que lo pone el backend). */
export interface ParametrosProductos {
  busqueda?: string | null
  categoria?: string | null
  marca?: string | null
  orden?: OrdenProductos
  /** Máximo 48. */
  limite?: number
  desde?: number
}

export interface ProductoResumen {
  sku: string
  nombre: string
  precio: number
  imagen_url: string | null
  categoria: string | null
  marca: string | null
  disponible: boolean
}

/** Respuesta de web_productos. */
export interface PaginaProductos {
  total: number
  filas: ProductoResumen[]
}

/** jsonb libre que la empresa escribe en el panel. */
export type Especificaciones = Record<string, unknown> | unknown[] | null

/** Respuesta de web_producto. null si el SKU no existe o no está publicado. */
export interface ProductoDetalle {
  sku: string
  nombre: string
  descripcion: string | null
  precio: number
  imagen_url: string | null
  especificaciones: Especificaciones
  categoria: string | null
  marca: string | null
  disponible: boolean
}

/** Un elemento de la respuesta de web_disponibilidad. */
export interface Disponibilidad {
  sku: string
  nombre: string
  precio: number
  disponible: boolean
}

/** Límites que aplica el backend; la plantilla los respeta antes de llamar. */
export const LIMITE_PRODUCTOS = 48
export const LIMITE_SKUS = 50
export const PRODUCTOS_POR_PAGINA = 24
