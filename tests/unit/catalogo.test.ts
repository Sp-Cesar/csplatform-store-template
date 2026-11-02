import { describe, expect, it } from 'vitest'
import { leerFiltros, parametrosDeFiltros, rutaProducto, totalPaginas, urlCatalogo } from '../../src/lib/catalogo'

describe('catálogo', () => {
  it('lee los filtros y corrige valores inválidos', () => {
    expect(leerFiltros(new URLSearchParams('q=  mouse &orden=raro&pagina=-2&categoria=cat-1'))).toEqual({
      q: 'mouse',
      categoria: 'cat-1',
      marca: '',
      orden: 'nombre',
      pagina: 1,
    })
    expect(leerFiltros(new URLSearchParams('orden=precio_desc&pagina=3'))).toMatchObject({ orden: 'precio_desc', pagina: 3 })
    expect(leerFiltros(new URLSearchParams(`q=${'a'.repeat(200)}`)).q).toHaveLength(80)
  })

  it('convierte la página en desde y límite', () => {
    const f = leerFiltros(new URLSearchParams('pagina=3&q=lap'))
    expect(parametrosDeFiltros(f, 24)).toEqual({ busqueda: 'lap', categoria: null, marca: null, orden: 'nombre', limite: 24, desde: 48 })
  })

  it('arma direcciones cortas', () => {
    expect(urlCatalogo({})).toBe('/productos')
    expect(urlCatalogo({ q: 'mouse inalámbrico', orden: 'nombre', pagina: 1 })).toBe('/productos?q=mouse+inal%C3%A1mbrico')
    expect(urlCatalogo({ marca: 'm1', orden: 'recientes', pagina: 2 })).toBe('/productos?marca=m1&orden=recientes&pagina=2')
  })

  it('calcula páginas y rutas de producto', () => {
    expect(totalPaginas(0)).toBe(1)
    expect(totalPaginas(49, 24)).toBe(3)
    expect(rutaProducto('LAP 001/A')).toBe('/productos/LAP%20001%2FA')
  })
})
