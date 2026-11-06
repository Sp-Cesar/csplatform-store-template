import { describe, expect, it } from 'vitest'
import { reclamoVacio, validarReclamo, type Reclamo } from '../../src/lib/reclamo'

function valido(): Reclamo {
  const r = reclamoVacio()
  return {
    ...r,
    consumidor: {
      ...r.consumidor,
      nombres: '  Ana Pérez  ',
      numero_documento: '12345678',
      domicilio: 'Av. Siempre Viva 123',
      telefono: '987 654 321',
      email: 'Ana@Correo.PE',
    },
    bien: { tipo: 'producto', descripcion: 'Laptop LAP-001', monto: 10.126 },
    detalle: 'La laptop llegó con la pantalla rota.',
    pedido: 'Cambio del producto',
    declaracion: true,
  }
}

describe('validarReclamo', () => {
  it('acepta un reclamo completo y lo limpia', () => {
    const r = validarReclamo(valido())
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.reclamo.consumidor.nombres).toBe('Ana Pérez')
    expect(r.reclamo.consumidor.telefono).toBe('987654321')
    expect(r.reclamo.consumidor.email).toBe('ana@correo.pe')
    expect(r.reclamo.bien.monto).toBe(10.13)
    expect(r.reclamo.consumidor.apoderado).toBeNull()
  })

  it('marca cada campo con error', () => {
    const r = validarReclamo({ ...reclamoVacio(), tipo: 'otro' })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(Object.keys(r.errores).sort()).toEqual(
      [
        'bien.descripcion',
        'consumidor.domicilio',
        'consumidor.email',
        'consumidor.nombres',
        'consumidor.numero_documento',
        'consumidor.telefono',
        'declaracion',
        'detalle',
        'pedido',
        'tipo',
      ].sort(),
    )
  })

  it('valida el documento según su tipo', () => {
    const conDocumento = (tipo_documento: string, numero_documento: string) =>
      validarReclamo({ ...valido(), consumidor: { ...valido().consumidor, tipo_documento, numero_documento } })
    expect(conDocumento('DNI', '1234567').ok).toBe(false)
    expect(conDocumento('RUC', '20123456789').ok).toBe(true)
    expect(conDocumento('RUC', '30123456789').ok).toBe(false)
    expect(conDocumento('CE', '001234567').ok).toBe(true)
  })

  it('exige apoderado para menores de edad', () => {
    const menor = { ...valido(), consumidor: { ...valido().consumidor, menor_de_edad: true, apoderado: '' } }
    const r = validarReclamo(menor)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errores['consumidor.apoderado']).toBeDefined()
  })

  it('descarta campos desconocidos y textos demasiado largos', () => {
    const r = validarReclamo({ ...valido(), extra: 'x', consumidor: { ...valido().consumidor, rol: 'admin' } })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect('extra' in r.reclamo).toBe(false)
      expect('rol' in r.reclamo.consumidor).toBe(false)
    }
    expect(validarReclamo({ ...valido(), detalle: 'x'.repeat(2001) }).ok).toBe(false)
  })

  it('tolera entradas que no son objetos', () => {
    expect(validarReclamo(null).ok).toBe(false)
    expect(validarReclamo('texto').ok).toBe(false)
  })
})
