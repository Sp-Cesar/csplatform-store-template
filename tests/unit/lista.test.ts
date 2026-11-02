import { describe, expect, it, vi } from 'vitest'
import {
  CANTIDAD_MAXIMA,
  EVENTO_LISTA,
  agregar,
  cambiarCantidad,
  guardarLista,
  leerLista,
  quitar,
  refrescar,
  totalLista,
  unidades,
  type ElementoLista,
} from '../../src/lib/lista'

const laptop = { sku: 'LAP-001', nombre: 'Laptop', precio: 2500 }
const mouse = { sku: 'MOU-010', nombre: 'Mouse', precio: 60 }

function almacenFalso(): Storage {
  const datos = new Map<string, string>()
  return {
    get length() {
      return datos.size
    },
    clear: () => datos.clear(),
    getItem: (k) => datos.get(k) ?? null,
    key: (i) => [...datos.keys()][i] ?? null,
    removeItem: (k) => void datos.delete(k),
    setItem: (k, v) => void datos.set(k, v),
  }
}

describe('operaciones de la lista', () => {
  it('agrega y suma cantidades del mismo SKU', () => {
    let lista = agregar([], laptop)
    lista = agregar(lista, mouse, 2)
    lista = agregar(lista, mouse)
    expect(lista).toEqual([
      { ...laptop, cantidad: 1 },
      { ...mouse, cantidad: 3 },
    ])
    expect(unidades(lista)).toBe(4)
  })

  it('limita la cantidad y quita con cantidad 0', () => {
    const lista = agregar([], mouse, 500)
    expect(lista[0].cantidad).toBe(CANTIDAD_MAXIMA)
    expect(cambiarCantidad(lista, mouse.sku, 0)).toEqual([])
    expect(quitar(lista, mouse.sku)).toEqual([])
    expect(agregar([], mouse, 0)).toEqual([])
  })

  it('calcula el total', () => {
    const lista: ElementoLista[] = [
      { ...laptop, cantidad: 1 },
      { ...mouse, cantidad: 2 },
    ]
    expect(totalLista(lista)).toBe(2620)
  })
})

describe('refrescar', () => {
  it('actualiza precios, quita agotados y retirados, y reporta cada cambio', () => {
    const lista: ElementoLista[] = [
      { ...laptop, cantidad: 1 },
      { ...mouse, cantidad: 2 },
      { sku: 'X-1', nombre: 'Retirado', precio: 10, cantidad: 1 },
    ]
    const { lista: nueva, cambios } = refrescar(lista, [
      { sku: 'LAP-001', nombre: 'Laptop', precio: 2400, disponible: true },
      { sku: 'MOU-010', nombre: 'Mouse', precio: 60, disponible: false },
    ])
    expect(nueva).toEqual([{ ...laptop, precio: 2400, cantidad: 1 }])
    expect(cambios).toEqual([
      { tipo: 'precio', sku: 'LAP-001', nombre: 'Laptop', antes: 2500, ahora: 2400 },
      { tipo: 'agotado', sku: 'MOU-010', nombre: 'Mouse' },
      { tipo: 'retirado', sku: 'X-1', nombre: 'Retirado' },
    ])
  })
})

describe('guardado', () => {
  it('guarda por slug y sobrevive a la recarga', () => {
    const almacen = almacenFalso()
    const lista = agregar([], laptop, 2)
    guardarLista('tienda-a', lista, almacen)
    expect(leerLista('tienda-a', almacen)).toEqual(lista)
    expect(leerLista('tienda-b', almacen)).toEqual([])
    expect(almacen.getItem('lista:tienda-a')).not.toBeNull()
  })

  it('borra la clave al vaciar y avisa con un evento', () => {
    const almacen = almacenFalso()
    const emitir = vi.fn()
    vi.stubGlobal('dispatchEvent', emitir)
    guardarLista('t', agregar([], mouse), almacen)
    guardarLista('t', [], almacen)
    vi.unstubAllGlobals()
    expect(almacen.getItem('lista:t')).toBeNull()
    expect(emitir).toHaveBeenCalledTimes(2)
    expect(emitir.mock.calls[1][0]).toMatchObject({ type: EVENTO_LISTA, detail: [] })
  })

  it('ignora datos dañados', () => {
    const almacen = almacenFalso()
    almacen.setItem('lista:t', '{no es json')
    expect(leerLista('t', almacen)).toEqual([])
    almacen.setItem('lista:t', JSON.stringify([{ sku: 'A', nombre: 'A', precio: 'caro', cantidad: 1 }, { ...mouse, cantidad: 2 }]))
    expect(leerLista('t', almacen)).toEqual([{ ...mouse, cantidad: 2 }])
  })

  it('sigue funcionando sin almacenamiento o con almacenamiento bloqueado', () => {
    const fallar = () => {
      throw new Error('bloqueado')
    }
    const bloqueado = { ...almacenFalso(), getItem: fallar, setItem: fallar, removeItem: fallar } as Storage
    expect(leerLista('t', bloqueado)).toEqual([])
    expect(() => guardarLista('t', agregar([], mouse), bloqueado)).not.toThrow()
    expect(leerLista('t', undefined)).toEqual([])
  })
})
