import { describe, expect, it } from 'vitest'
import { enlaceWhatsapp, mensajeConsulta, mensajePedido, normalizarWhatsapp } from '../../src/lib/whatsapp'

const elementos = [
  { sku: 'LAP-001', nombre: 'Laptop Lenovo IdeaPad', precio: 2500, cantidad: 1 },
  { sku: 'MOU-010', nombre: 'Mouse Logitech', precio: 60, cantidad: 2 },
]

describe('mensajePedido', () => {
  it('sigue el formato del plan (sección 7.4)', () => {
    expect(mensajePedido({ elementos, nombre: ' Ana Pérez ', entrega: 'recojo en tienda' })).toBe(
      [
        'Hola, quiero hacer este pedido desde la web:',
        '1 x Laptop Lenovo IdeaPad (LAP-001) - S/ 2,500.00',
        '2 x Mouse Logitech (MOU-010) - S/ 120.00',
        'Total referencial: S/ 2,620.00',
        'Nombre: Ana Pérez',
        'Entrega: recojo en tienda',
      ].join('\n'),
    )
  })

  it('omite nombre y entrega vacíos', () => {
    const mensaje = mensajePedido({ elementos: elementos.slice(0, 1), nombre: '  ' })
    expect(mensaje).not.toContain('Nombre:')
    expect(mensaje).not.toContain('Entrega:')
  })
})

describe('enlaces', () => {
  it('normaliza el número', () => {
    expect(normalizarWhatsapp('+51 987 654 321')).toBe('51987654321')
    expect(normalizarWhatsapp('123')).toBeNull()
    expect(normalizarWhatsapp(null)).toBeNull()
  })

  it('codifica el mensaje en wa.me', () => {
    const enlace = enlaceWhatsapp('51987654321', 'Hola & adiós\nS/ 1.00')
    expect(enlace).toBe('https://wa.me/51987654321?text=Hola%20%26%20adi%C3%B3s%0AS%2F%201.00')
    expect(new URL(enlace!).searchParams.get('text')).toBe('Hola & adiós\nS/ 1.00')
  })

  it('sin WhatsApp no hay enlace', () => {
    expect(enlaceWhatsapp(null, 'x')).toBeNull()
  })

  it('arma la consulta de un producto', () => {
    expect(mensajeConsulta({ nombre: 'Mouse', sku: 'MOU-010' })).toBe('Hola, quiero consultar por este producto: Mouse (MOU-010)')
  })
})
