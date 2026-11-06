// Modo demo: imita las funciones web_* con datos de ejemplo, sin conexión al backend.
// Sirve para diseñar y probar mientras el backend no está listo o sin tocar datos reales.
// Se activa con PUBLIC_MODO_DEMO=true. El slug "no-disponible" simula una web desactivada.
// Núcleo compartido: no editar por cliente.

import { normalizarParametros, normalizarSkus, type Backend } from './backend'
import type { ConstanciaReclamo } from './reclamo'
import type { Filtros, OpcionFiltro, ProductoDetalle, Tienda } from './tipos'

export const SLUG_NO_DISPONIBLE = 'no-disponible'

interface ProductoDemo extends ProductoDetalle {
  categoria_id: string
  marca_id: string
  /** Orden de creación, para "recientes". */
  creado: number
}

const CATEGORIAS = { laptops: 'Laptops', perifericos: 'Periféricos', monitores: 'Monitores', redes: 'Redes' }
const MARCAS = { lenovo: 'Lenovo', logitech: 'Logitech', hp: 'HP', samsung: 'Samsung', tplink: 'TP-Link' }

type Categoria = keyof typeof CATEGORIAS
type Marca = keyof typeof MARCAS

function p(
  creado: number,
  sku: string,
  nombre: string,
  precio: number,
  categoria: Categoria,
  marca: Marca,
  disponible = true,
  especificaciones: ProductoDetalle['especificaciones'] = null,
): ProductoDemo {
  return {
    sku,
    nombre,
    descripcion: `${nombre}. Producto de ejemplo del modo demo: el texto real lo escribe la empresa en el panel.`,
    precio,
    imagen_url: null,
    especificaciones,
    categoria: CATEGORIAS[categoria],
    categoria_id: `cat-${categoria}`,
    marca: MARCAS[marca],
    marca_id: `mar-${marca}`,
    disponible,
    creado,
  }
}

const PRODUCTOS: ProductoDemo[] = [
  p(1, 'LAP-001', 'Laptop Lenovo IdeaPad 3 15"', 2500, 'laptops', 'lenovo', true, {
    Procesador: 'Intel Core i5-1235U',
    Memoria: '8 GB DDR4',
    Almacenamiento: '512 GB SSD',
    Pantalla: '15,6" Full HD',
  }),
  p(2, 'LAP-002', 'Laptop HP 240 G9', 1899, 'laptops', 'hp', true, { Procesador: 'Intel Core i3', Memoria: '8 GB' }),
  p(3, 'LAP-003', 'Laptop Lenovo ThinkPad E14', 3650, 'laptops', 'lenovo', false),
  p(4, 'MOU-010', 'Mouse inalámbrico Logitech M170', 60, 'perifericos', 'logitech'),
  p(5, 'MOU-011', 'Mouse Logitech MX Master 3S', 459, 'perifericos', 'logitech', true, { Conexión: 'Bluetooth / USB', DPI: 8000 }),
  p(6, 'TEC-020', 'Teclado Logitech K120', 45, 'perifericos', 'logitech'),
  p(7, 'TEC-021', 'Combo teclado y mouse HP 230', 129, 'perifericos', 'hp', false),
  p(8, 'MON-030', 'Monitor Samsung 24" Full HD', 549, 'monitores', 'samsung', true, { Tamaño: '24"', Panel: 'IPS', Frecuencia: '75 Hz' }),
  p(9, 'MON-031', 'Monitor Samsung 27" curvo', 899, 'monitores', 'samsung'),
  p(10, 'MON-032', 'Monitor HP V22', 399, 'monitores', 'hp'),
  p(11, 'RED-040', 'Router TP-Link Archer C6', 189, 'redes', 'tplink'),
  p(12, 'RED-041', 'Switch TP-Link 8 puertos', 85, 'redes', 'tplink'),
  p(13, 'RED-042', 'Adaptador USB WiFi TP-Link', 39.9, 'redes', 'tplink'),
]

const TIENDA: Omit<Tienda, 'slug'> = {
  version_contrato: 1,
  nombre: 'Tienda Demo',
  logo_url: null,
  whatsapp: '51999999999',
  telefono: '01 555 0000',
  direccion: 'Av. Ejemplo 123, Lima',
  email: 'ventas@tienda-demo.pe',
  sitio_web: null,
  razon_social: 'Tienda Demo S.A.C.',
  ruc: '20000000001',
}

const contiene = (texto: string, busqueda: string) => texto.toLowerCase().includes(busqueda.toLowerCase())

function resumen(prod: ProductoDemo) {
  const { sku, nombre, precio, imagen_url, categoria, marca, disponible } = prod
  return { sku, nombre, precio, imagen_url, categoria, marca, disponible }
}

function opciones(clave: 'categoria' | 'marca'): OpcionFiltro[] {
  const conteo = new Map<string, OpcionFiltro>()
  for (const prod of PRODUCTOS) {
    const id = clave === 'categoria' ? prod.categoria_id : prod.marca_id
    const nombre = prod[clave] ?? ''
    const actual = conteo.get(id) ?? { id, nombre, total: 0 }
    conteo.set(id, { ...actual, total: actual.total + 1 })
  }
  return [...conteo.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

/** Simula la latencia de la red para que los estados de carga se vean al diseñar. */
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function crearBackendDemo(slug: string, latencia = 0): Backend {
  const visible = slug !== SLUG_NO_DISPONIBLE
  let correlativo = 0
  const responder = async <T>(valor: T): Promise<T> => {
    if (latencia > 0) await esperar(latencia)
    return structuredClone(valor)
  }

  return {
    tienda: () => responder(visible ? { ...TIENDA, slug } : null),

    filtros: () =>
      responder<Filtros>(visible ? { categorias: opciones('categoria'), marcas: opciones('marca') } : { categorias: [], marcas: [] }),

    productos: (parametros) => {
      if (!visible) return responder({ total: 0, filas: [] })
      const q = normalizarParametros(parametros)
      let filas = PRODUCTOS.filter(
        (prod) =>
          (!q.p_busqueda || contiene(prod.nombre, q.p_busqueda) || contiene(prod.sku, q.p_busqueda)) &&
          (!q.p_categoria || prod.categoria_id === q.p_categoria) &&
          (!q.p_marca || prod.marca_id === q.p_marca),
      )
      const orden = {
        nombre: (a: ProductoDemo, b: ProductoDemo) => a.nombre.localeCompare(b.nombre, 'es'),
        precio_asc: (a: ProductoDemo, b: ProductoDemo) => a.precio - b.precio,
        precio_desc: (a: ProductoDemo, b: ProductoDemo) => b.precio - a.precio,
        recientes: (a: ProductoDemo, b: ProductoDemo) => b.creado - a.creado,
      }[q.p_orden]
      filas = [...filas].sort(orden)
      return responder({ total: filas.length, filas: filas.slice(q.p_desde, q.p_desde + q.p_limite).map(resumen) })
    },

    producto: (sku) => {
      const prod = visible ? PRODUCTOS.find((x) => x.sku === sku.trim()) : undefined
      if (!prod) return responder(null)
      const { categoria_id: _c, marca_id: _m, creado: _o, ...detalle } = prod
      return responder<ProductoDetalle>(detalle)
    },

    disponibilidad: (skus) => {
      if (!visible) return responder([])
      const pedidos = new Set(normalizarSkus(skus))
      return responder(
        PRODUCTOS.filter((x) => pedidos.has(x.sku)).map(({ sku, nombre, precio, disponible }) => ({ sku, nombre, precio, disponible })),
      )
    },
      // Simula el registro: no guarda nada. El código sigue el formato que devolverá el backend.
    registrarReclamo: () => {
      correlativo += 1
      const ahora = new Date()
      return responder<ConstanciaReclamo>({
        codigo: `DEMO-${ahora.getFullYear()}-${String(correlativo).padStart(6, '0')}`,
        fecha: ahora.toISOString(),
      })
    },
  }
}
