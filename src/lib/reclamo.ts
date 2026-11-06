// Libro de Reclamaciones virtual: datos y validación. La misma validación corre en el navegador
// (para avisar al comprador) y en el servidor (la que vale). Núcleo compartido: no editar por cliente.
// Campos basados en el Reglamento del Libro de Reclamaciones (Perú). Revisar con asesoría legal.

export type TipoReclamo = 'reclamo' | 'queja'
export type TipoDocumento = 'DNI' | 'CE' | 'PASAPORTE' | 'RUC'
export type TipoBien = 'producto' | 'servicio'

export const TIPOS_DOCUMENTO: readonly TipoDocumento[] = ['DNI', 'CE', 'PASAPORTE', 'RUC']

export interface Reclamo {
  tipo: TipoReclamo
  consumidor: {
    nombres: string
    tipo_documento: TipoDocumento
    numero_documento: string
    domicilio: string
    telefono: string
    email: string
    menor_de_edad: boolean
    /** Padre, madre o apoderado si el consumidor es menor de edad. */
    apoderado: string | null
  }
  bien: {
    tipo: TipoBien
    descripcion: string
    /** Monto reclamado en soles; null si no aplica. */
    monto: number | null
  }
  detalle: string
  pedido: string
  /** El consumidor declara que los datos son verdaderos. */
  declaracion: boolean
}

/** Respuesta del backend al registrar: número correlativo y fecha. */
export interface ConstanciaReclamo {
  codigo: string
  fecha: string
}

export type ErroresReclamo = Partial<Record<string, string>>

const LARGOS = { nombres: 120, domicilio: 200, descripcion: 300, detalle: 2000, pedido: 1000, apoderado: 120 }

const PATRON_DOCUMENTO: Record<TipoDocumento, RegExp> = {
  DNI: /^\d{8}$/,
  CE: /^[A-Za-z0-9]{8,12}$/,
  PASAPORTE: /^[A-Za-z0-9]{6,12}$/,
  RUC: /^(10|15|17|20)\d{9}$/,
}

const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/** Reclamo vacío para iniciar el formulario. */
export function reclamoVacio(): Reclamo {
  return {
    tipo: 'reclamo',
    consumidor: {
      nombres: '',
      tipo_documento: 'DNI',
      numero_documento: '',
      domicilio: '',
      telefono: '',
      email: '',
      menor_de_edad: false,
      apoderado: null,
    },
    bien: { tipo: 'producto', descripcion: '', monto: null },
    detalle: '',
    pedido: '',
    declaracion: false,
  }
}

/**
 * Valida y limpia un reclamo recibido (de un formulario o de una petición). Descarta campos desconocidos.
 * Las claves de error usan la ruta del campo, por ejemplo "consumidor.email".
 */
export function validarReclamo(entrada: unknown): { ok: true; reclamo: Reclamo } | { ok: false; errores: ErroresReclamo } {
  const d = (entrada ?? {}) as Record<string, any>
  const c = (d.consumidor ?? {}) as Record<string, unknown>
  const b = (d.bien ?? {}) as Record<string, unknown>
  const errores: ErroresReclamo = {}

  const obligatorio = (clave: string, valor: string, maximo: number, minimo = 2) => {
    if (valor.length < minimo) errores[clave] = 'Completa este campo.'
    else if (valor.length > maximo) errores[clave] = `Máximo ${maximo} caracteres.`
  }

  const tipo: TipoReclamo = d.tipo === 'queja' ? 'queja' : 'reclamo'
  if (d.tipo !== 'reclamo' && d.tipo !== 'queja') errores.tipo = 'Elige reclamo o queja.'

  const nombres = texto(c.nombres)
  obligatorio('consumidor.nombres', nombres, LARGOS.nombres, 3)

  const tipoDocumento = TIPOS_DOCUMENTO.includes(c.tipo_documento as TipoDocumento) ? (c.tipo_documento as TipoDocumento) : 'DNI'
  const numeroDocumento = texto(c.numero_documento).replace(/\s/g, '')
  if (!PATRON_DOCUMENTO[tipoDocumento].test(numeroDocumento)) errores['consumidor.numero_documento'] = `Número de ${tipoDocumento} no válido.`

  const domicilio = texto(c.domicilio)
  obligatorio('consumidor.domicilio', domicilio, LARGOS.domicilio, 5)

  const telefono = texto(c.telefono).replace(/[\s()-]/g, '')
  if (!/^\+?\d{6,15}$/.test(telefono)) errores['consumidor.telefono'] = 'Teléfono no válido.'

  const email = texto(c.email).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) errores['consumidor.email'] = 'Correo no válido.'

  const menor = c.menor_de_edad === true
  const apoderado = menor ? texto(c.apoderado) : ''
  if (menor) obligatorio('consumidor.apoderado', apoderado, LARGOS.apoderado, 3)

  const tipoBien: TipoBien = b.tipo === 'servicio' ? 'servicio' : 'producto'
  const descripcion = texto(b.descripcion)
  obligatorio('bien.descripcion', descripcion, LARGOS.descripcion, 3)

  let monto: number | null = null
  if (b.monto !== null && b.monto !== undefined && b.monto !== '') {
    monto = Number(b.monto)
    if (!Number.isFinite(monto) || monto < 0 || monto > 10_000_000) errores['bien.monto'] = 'Monto no válido.'
    else monto = Math.round(monto * 100) / 100
  }

  const detalle = texto(d.detalle)
  obligatorio('detalle', detalle, LARGOS.detalle, 10)
  const pedido = texto(d.pedido)
  obligatorio('pedido', pedido, LARGOS.pedido, 5)

  if (d.declaracion !== true) errores.declaracion = 'Debes confirmar que los datos son verdaderos.'

  if (Object.keys(errores).length > 0) return { ok: false, errores }
  return {
    ok: true,
    reclamo: {
      tipo,
      consumidor: {
        nombres,
        tipo_documento: tipoDocumento,
        numero_documento: numeroDocumento.toUpperCase(),
        domicilio,
        telefono,
        email,
        menor_de_edad: menor,
        apoderado: menor ? apoderado : null,
      },
      bien: { tipo: tipoBien, descripcion, monto },
      detalle,
      pedido,
      declaracion: true,
    },
  }
}
