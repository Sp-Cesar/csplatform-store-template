import { describe, expect, it, vi } from 'vitest'
import { leerJson, mismoOrigen } from '../../src/lib/api'
import { crearLimitador } from '../../src/lib/limite'
import { armarSobre, crearReportador, leerDsn } from '../../src/lib/monitoreo'

describe('crearLimitador', () => {
  it('permite hasta el máximo por ventana y luego indica cuándo reintentar', () => {
    const permitir = crearLimitador({ maximo: 2, ventanaMs: 60_000 })
    expect(permitir('ip1', 0)).toEqual({ ok: true })
    expect(permitir('ip1', 1_000)).toEqual({ ok: true })
    expect(permitir('ip1', 2_000)).toEqual({ ok: false, reintentarEnSegundos: 58 })
    expect(permitir('ip2', 2_000)).toEqual({ ok: true })
    expect(permitir('ip1', 60_001)).toEqual({ ok: true })
  })

  it('no crece sin límite', () => {
    const permitir = crearLimitador({ maximo: 1, ventanaMs: 60_000, capacidad: 2 })
    permitir('a', 0)
    permitir('b', 0)
    permitir('c', 0)
    // "a" se olvidó por capacidad: vuelve a estar permitido.
    expect(permitir('a', 1)).toEqual({ ok: true })
  })
})

describe('mismoOrigen', () => {
  const url = new URL('https://tienda.pe/api/reclamos')
  const pedido = (cabeceras: Record<string, string>) => new Request(url, { method: 'POST', headers: cabeceras })

  it('acepta el mismo origen y rechaza otros sitios o peticiones sin origen', () => {
    expect(mismoOrigen(pedido({ origin: 'https://tienda.pe' }), url)).toBe(true)
    expect(mismoOrigen(pedido({ origin: 'https://malo.com' }), url)).toBe(false)
    expect(mismoOrigen(pedido({ referer: 'https://tienda.pe/lista' }), url)).toBe(true)
    expect(mismoOrigen(pedido({}), url)).toBe(false)
  })
})

describe('leerJson', () => {
  it('rechaza cuerpos grandes o inválidos', async () => {
    const pedido = (cuerpo: string) => new Request('https://x.pe', { method: 'POST', body: cuerpo })
    expect(await leerJson(pedido('{"a":1}'), 100)).toEqual({ a: 1 })
    expect(await leerJson(pedido('no es json'), 100)).toBeNull()
    expect(await leerJson(pedido('x'.repeat(200)), 100)).toBeNull()
  })
})

describe('monitoreo', () => {
  const DSN = 'https://clave123@o1.ingest.sentry.io/456'

  it('lee el DSN y rechaza los inválidos', () => {
    expect(leerDsn(DSN)).toEqual({ clave: 'clave123', url: 'https://o1.ingest.sentry.io/api/456/envelope/', proyecto: '456' })
    expect(leerDsn('no-es-url')).toBeNull()
    expect(leerDsn('https://o1.ingest.sentry.io/456')).toBeNull()
    expect(leerDsn(undefined)).toBeNull()
  })

  it('arma un sobre de Sentry con el error y las etiquetas', () => {
    const lineas = armarSobre(new TypeError('falló'), { endpoint: '/api/x', vacio: undefined }, DSN, 'production').split('\n')
    expect(lineas).toHaveLength(3)
    expect(JSON.parse(lineas[1])).toEqual({ type: 'event' })
    const evento = JSON.parse(lineas[2])
    expect(evento.exception.values[0]).toEqual({ type: 'TypeError', value: 'falló' })
    expect(evento.tags).toEqual({ endpoint: '/api/x' })
    expect(evento.environment).toBe('production')
  })

  it('sin DSN solo registra en consola; con DSN envía y nunca lanza', async () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetch = vi.fn(async () => {
      throw new Error('sin red')
    })
    await crearReportador({ fetch })(new Error('a'))
    expect(fetch).not.toHaveBeenCalled()
    await expect(crearReportador({ dsn: DSN, fetch })(new Error('b'))).resolves.toBeUndefined()
    expect(fetch).toHaveBeenCalledOnce()
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://o1.ingest.sentry.io/api/456/envelope/')
    expect((init.headers as Record<string, string>)['X-Sentry-Auth']).toContain('sentry_key=clave123')
    consola.mockRestore()
  })
})
