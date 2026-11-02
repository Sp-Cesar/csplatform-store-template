import { describe, expect, it, vi } from 'vitest'
import { ErrorBackend, crearBackendSupabase, normalizarParametros, normalizarSkus, slugValido } from '../../src/lib/backend'
import { SLUG_NO_DISPONIBLE, crearBackendDemo } from '../../src/lib/demo'

const URL_BASE = 'https://ejemplo.supabase.co'

function fetchFalso(respuesta: unknown, estado = 200) {
  return vi.fn(
    async (_url: string | URL | Request, _init?: RequestInit) =>
      new Response(JSON.stringify(respuesta), { status: estado, headers: { 'Content-Type': 'application/json' } }),
  )
}

describe('validaciones', () => {
  it('valida el slug con la misma regla del backend', () => {
    expect(slugValido('mi-tienda')).toBe(true)
    expect(slugValido('ab')).toBe(false)
    expect(slugValido('Mi-Tienda')).toBe(false)
    expect(slugValido('-tienda')).toBe(false)
    expect(slugValido('a'.repeat(41))).toBe(false)
  })

  it('ajusta los parámetros a los límites del contrato', () => {
    expect(normalizarParametros({ busqueda: '  ', limite: 500, desde: -3, orden: 'raro' as never })).toEqual({
      p_busqueda: null,
      p_categoria: null,
      p_marca: null,
      p_orden: 'nombre',
      p_limite: 48,
      p_desde: 0,
    })
  })

  it('limpia y limita los SKU', () => {
    const muchos = Array.from({ length: 80 }, (_, i) => `S-${i}`)
    expect(normalizarSkus([' A ', 'A', '', 'B'])).toEqual(['A', 'B'])
    expect(normalizarSkus(muchos)).toHaveLength(50)
  })
})

describe('crearBackendSupabase', () => {
  it('rechaza una configuración incompleta', () => {
    expect(() => crearBackendSupabase({ url: '', anonKey: 'k', slug: 'demo' })).toThrow(ErrorBackend)
    expect(() => crearBackendSupabase({ url: URL_BASE, anonKey: 'k', slug: 'NO VALE' })).toThrow(/SLUG/)
  })

  it('llama a la RPC con la clave anon y el slug', async () => {
    const fetch = fetchFalso({ total: 0, filas: [] })
    const b = crearBackendSupabase({ url: `${URL_BASE}/`, anonKey: 'clave', slug: 'mi-tienda', fetch })
    await b.productos({ busqueda: 'mouse', limite: 10 })
    const [url, init] = fetch.mock.calls[0]
    const cabeceras = init?.headers as Record<string, string>
    expect(url).toBe(`${URL_BASE}/rest/v1/rpc/web_productos`)
    expect(init?.method).toBe('POST')
    expect(cabeceras.apikey).toBe('clave')
    expect(cabeceras.Authorization).toBe('Bearer clave')
    expect(JSON.parse(init?.body as string)).toMatchObject({ p_slug: 'mi-tienda', p_busqueda: 'mouse', p_limite: 10, p_desde: 0 })
  })

  it('convierte null en valores vacíos y no llama sin SKU', async () => {
    const fetch = fetchFalso(null)
    const b = crearBackendSupabase({ url: URL_BASE, anonKey: 'k', slug: 'demo', fetch })
    expect(await b.tienda()).toBeNull()
    expect(await b.filtros()).toEqual({ categorias: [], marcas: [] })
    expect(await b.productos()).toEqual({ total: 0, filas: [] })
    expect(await b.disponibilidad([])).toEqual([])
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('lanza ErrorBackend con el estado HTTP', async () => {
    const b = crearBackendSupabase({ url: URL_BASE, anonKey: 'k', slug: 'demo', fetch: fetchFalso({ message: 'x' }, 404) })
    await expect(b.tienda()).rejects.toMatchObject({ name: 'ErrorBackend', estado: 404 })
  })

  it('lanza ErrorBackend si no hay red', async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError('fetch failed')
    })
    const b = crearBackendSupabase({ url: URL_BASE, anonKey: 'k', slug: 'demo', fetch })
    await expect(b.tienda()).rejects.toThrow(/No se pudo conectar/)
  })
})

describe('modo demo', () => {
  const b = crearBackendDemo('demo')

  it('devuelve la tienda con el contrato 1', async () => {
    expect(await b.tienda()).toMatchObject({ version_contrato: 1, slug: 'demo' })
  })

  it('busca de forma literal por nombre o SKU', async () => {
    expect((await b.productos({ busqueda: 'mou-01' })).filas.map((p) => p.sku)).toEqual(['MOU-010', 'MOU-011'])
    expect((await b.productos({ busqueda: '%' })).total).toBe(0)
  })

  it('filtra, ordena y pagina', async () => {
    const { categorias } = await b.filtros()
    const laptops = categorias.find((c) => c.nombre === 'Laptops')!
    const pagina = await b.productos({ categoria: laptops.id, orden: 'precio_desc', limite: 2 })
    expect(pagina.total).toBe(laptops.total)
    expect(pagina.filas.map((p) => p.precio)).toEqual([3650, 2500])
  })

  it('nunca expone campos internos', async () => {
    const detalle = await b.producto('LAP-001')
    expect(Object.keys(detalle!).sort()).toEqual(
      ['categoria', 'descripcion', 'disponible', 'especificaciones', 'imagen_url', 'marca', 'nombre', 'precio', 'sku'].sort(),
    )
    const { filas } = await b.productos()
    expect(Object.keys(filas[0]).sort()).toEqual(['categoria', 'disponible', 'imagen_url', 'marca', 'nombre', 'precio', 'sku'].sort())
  })

  it('refresca disponibilidad solo de SKU existentes', async () => {
    expect(await b.disponibilidad(['LAP-003', 'NO-EXISTE'])).toEqual([
      { sku: 'LAP-003', nombre: 'Laptop Lenovo ThinkPad E14', precio: 3650, disponible: false },
    ])
  })

  it('simula una web no disponible', async () => {
    const cerrada = crearBackendDemo(SLUG_NO_DISPONIBLE)
    expect(await cerrada.tienda()).toBeNull()
    expect((await cerrada.productos()).filas).toEqual([])
    expect(await cerrada.producto('LAP-001')).toBeNull()
  })
})
