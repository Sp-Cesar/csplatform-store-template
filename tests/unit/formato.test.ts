import { describe, expect, it } from 'vitest'
import { especificacionesComoFilas, formatearSoles } from '../../src/lib/formato'

describe('formatearSoles', () => {
  it('agrupa miles y fija dos decimales', () => {
    expect(formatearSoles(2500)).toBe('S/ 2,500.00')
    expect(formatearSoles(39.9)).toBe('S/ 39.90')
    expect(formatearSoles(1234567.891)).toBe('S/ 1,234,567.89')
    expect(formatearSoles(0)).toBe('S/ 0.00')
  })

  it('redondea sin errores de coma flotante', () => {
    expect(formatearSoles(0.1 + 0.2)).toBe('S/ 0.30')
  })

  it('tolera valores no numéricos', () => {
    expect(formatearSoles(Number.NaN)).toBe('S/ 0.00')
  })
})

describe('especificacionesComoFilas', () => {
  it('convierte un objeto en filas y omite vacíos', () => {
    expect(especificacionesComoFilas({ Memoria: '8 GB', DPI: 8000, Color: null })).toEqual([
      ['Memoria', '8 GB'],
      ['DPI', '8000'],
    ])
  })

  it('acepta una lista de {nombre, valor}', () => {
    expect(especificacionesComoFilas([{ nombre: 'Peso', valor: '1 kg' }, 'basura'])).toEqual([['Peso', '1 kg']])
  })

  it('devuelve vacío sin especificaciones', () => {
    expect(especificacionesComoFilas(null)).toEqual([])
  })
})
