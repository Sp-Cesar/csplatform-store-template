// Formulario del Libro de Reclamaciones virtual. Diseño libre por cliente; mantener todos los campos (son legales).
import { useEffect, useState } from 'preact/hooks'
import type { JSX } from 'preact'
import { registrarEvento } from '../../lib/analitica'
import { ErrorApi, enviarReclamo } from '../../lib/clienteApi'
import { TIPOS_DOCUMENTO, reclamoVacio, validarReclamo, type ConstanciaReclamo, type ErroresReclamo, type Reclamo } from '../../lib/reclamo'

interface Props {
  /** Datos de contacto de la tienda para el caso en que el registro falle. */
  email: string | null
  telefono: string | null
}

const estiloCampo = 'w-full rounded-md border border-borde bg-white px-3 py-2 text-base'

const MENSAJES_ERROR: Record<string, string> = {
  'demasiadas-peticiones': 'Enviaste varios reclamos seguidos. Espera unos minutos e intenta de nuevo.',
  'reclamos-no-habilitados': 'El registro en línea aún no está habilitado para esta tienda.',
  'tienda-no-disponible': 'La tienda no está disponible en este momento.',
  'sin-conexion': 'No hay conexión. Revisa tu internet e intenta de nuevo.',
}

export default function FormularioReclamo({ email, telefono }: Props) {
  const [datos, setDatos] = useState<Reclamo>(reclamoVacio)
  const [trampa, setTrampa] = useState('')
  const [errores, setErrores] = useState<ErroresReclamo>({})
  const [enviando, setEnviando] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState('')
  const [constancia, setConstancia] = useState<ConstanciaReclamo | null>(null)
  const [enviado, setEnviado] = useState<Reclamo | null>(null)
  // Sin JavaScript el formulario no puede validarse ni enviarse. Campos y botón se activan al cargar la isla;
  // así nadie escribe antes de tiempo y pierde lo escrito.
  const [listo, setListo] = useState(false)
  useEffect(() => setListo(true), [])

  const consumidor = <K extends keyof Reclamo['consumidor']>(k: K, v: Reclamo['consumidor'][K]) =>
    setDatos((d) => ({ ...d, consumidor: { ...d.consumidor, [k]: v } }))
  const bien = <K extends keyof Reclamo['bien']>(k: K, v: Reclamo['bien'][K]) => setDatos((d) => ({ ...d, bien: { ...d.bien, [k]: v } }))

  async function alEnviar(e: Event) {
    e.preventDefault()
    setErrorGeneral('')
    const v = validarReclamo(datos)
    if (!v.ok) {
      setErrores(v.errores)
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }
    setErrores({})
    setEnviando(true)
    try {
      const r = await enviarReclamo({ ...v.reclamo, trampa })
      setConstancia(r)
      setEnviado(v.reclamo)
      registrarEvento({ nombre: 'reclamo-registrado', datos: { tipo: v.reclamo.tipo } })
      scrollTo({ top: 0 })
    } catch (err) {
      const codigo = err instanceof ErrorApi ? err.codigo : 'error'
      if (err instanceof ErrorApi && err.errores) setErrores(err.errores)
      setErrorGeneral(MENSAJES_ERROR[codigo] ?? 'No pudimos registrar tu reclamo. Intenta de nuevo en unos minutos.')
    } finally {
      setEnviando(false)
    }
  }

  if (constancia && enviado) {
    return (
      <section class="flex flex-col gap-4 rounded-lg border border-borde bg-white p-5" aria-live="polite">
        <h2 class="text-xl font-semibold">Registramos tu {enviado.tipo}</h2>
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt class="text-suave">Código</dt>
          <dd class="font-semibold">{constancia.codigo}</dd>
          <dt class="text-suave">Fecha</dt>
          <dd>{new Date(constancia.fecha).toLocaleString('es-PE')}</dd>
          <dt class="text-suave">A nombre de</dt>
          <dd>{enviado.consumidor.nombres}</dd>
        </dl>
        <p class="text-sm">
          Enviaremos una copia a <strong>{enviado.consumidor.email}</strong>. La tienda responderá dentro del plazo legal. Guarda el código
          para cualquier consulta.
        </p>
        <button type="button" onClick={() => print()} class="w-fit rounded-md border border-borde px-4 py-2 font-medium">
          Imprimir constancia
        </button>
      </section>
    )
  }

  const campo = (ruta: string, etiqueta: string, control: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => JSX.Element, ayuda?: string) => {
    const id = `r-${ruta.replace('.', '-')}`
    const error = errores[ruta]
    return (
      <div class="flex flex-col gap-1">
        <label for={id} class="text-sm font-medium">
          {etiqueta}
        </label>
        {control({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `${id}-error` : undefined })}
        {ayuda && !error && <p class="text-xs text-suave">{ayuda}</p>}
        {error && (
          <p id={`${id}-error`} class="text-sm text-agotado">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={alEnviar} noValidate class="flex flex-col gap-6">
      {errorGeneral && (
        <div role="alert" class="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
          <p>{errorGeneral}</p>
          {(email || telefono) && (
            <p class="mt-1">
              También puedes presentarlo {email && <>escribiendo a <a href={`mailto:${email}`} class="underline">{email}</a></>}
              {email && telefono && ' o '}
              {telefono && <>llamando al {telefono}</>} o en el local de la tienda.
            </p>
          )}
        </div>
      )}

      <fieldset disabled={!listo} class="flex flex-col gap-4 rounded-lg border border-borde bg-white p-4 disabled:opacity-70">
        <legend class="px-1 font-semibold">1. Tus datos</legend>
        {campo('consumidor.nombres', 'Nombres y apellidos', (p) => (
          <input {...p} class={estiloCampo} autoComplete="name" value={datos.consumidor.nombres} onInput={(e) => consumidor('nombres', e.currentTarget.value)} />
        ))}
        <div class="grid gap-4 sm:grid-cols-[10rem_1fr]">
          {campo('consumidor.tipo_documento', 'Documento', (p) => (
            <select {...p} class={estiloCampo} value={datos.consumidor.tipo_documento} onChange={(e) => consumidor('tipo_documento', e.currentTarget.value as Reclamo['consumidor']['tipo_documento'])}>
              {TIPOS_DOCUMENTO.map((t) => (
                <option value={t}>{t === 'CE' ? 'Carné de extranjería' : t === 'PASAPORTE' ? 'Pasaporte' : t}</option>
              ))}
            </select>
          ))}
          {campo('consumidor.numero_documento', 'Número de documento', (p) => (
            <input {...p} class={estiloCampo} inputMode={datos.consumidor.tipo_documento === 'DNI' || datos.consumidor.tipo_documento === 'RUC' ? 'numeric' : 'text'} value={datos.consumidor.numero_documento} onInput={(e) => consumidor('numero_documento', e.currentTarget.value)} />
          ))}
        </div>
        {campo('consumidor.domicilio', 'Domicilio', (p) => (
          <input {...p} class={estiloCampo} autoComplete="street-address" value={datos.consumidor.domicilio} onInput={(e) => consumidor('domicilio', e.currentTarget.value)} />
        ))}
        <div class="grid gap-4 sm:grid-cols-2">
          {campo('consumidor.telefono', 'Teléfono', (p) => (
            <input {...p} type="tel" class={estiloCampo} autoComplete="tel" value={datos.consumidor.telefono} onInput={(e) => consumidor('telefono', e.currentTarget.value)} />
          ))}
          {campo('consumidor.email', 'Correo electrónico', (p) => (
            <input {...p} type="email" class={estiloCampo} autoComplete="email" value={datos.consumidor.email} onInput={(e) => consumidor('email', e.currentTarget.value)} />
          ), 'Aquí recibirás la copia de tu reclamo.')}
        </div>
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={datos.consumidor.menor_de_edad} onChange={(e) => consumidor('menor_de_edad', e.currentTarget.checked)} />
          Soy menor de edad
        </label>
        {datos.consumidor.menor_de_edad &&
          campo('consumidor.apoderado', 'Nombre del padre, madre o apoderado', (p) => (
            <input {...p} class={estiloCampo} value={datos.consumidor.apoderado ?? ''} onInput={(e) => consumidor('apoderado', e.currentTarget.value)} />
          ))}
      </fieldset>

      <fieldset disabled={!listo} class="flex flex-col gap-4 rounded-lg border border-borde bg-white p-4 disabled:opacity-70">
        <legend class="px-1 font-semibold">2. Producto o servicio</legend>
        <div class="flex gap-4 text-sm" role="radiogroup" aria-label="Tipo de bien">
          {(['producto', 'servicio'] as const).map((t) => (
            <label class="flex items-center gap-2">
              <input type="radio" name="bien" checked={datos.bien.tipo === t} onChange={() => bien('tipo', t)} />
              {t === 'producto' ? 'Producto' : 'Servicio'}
            </label>
          ))}
        </div>
        {campo('bien.descripcion', 'Descripción', (p) => (
          <input {...p} class={estiloCampo} value={datos.bien.descripcion} onInput={(e) => bien('descripcion', e.currentTarget.value)} />
        ), 'Por ejemplo: nombre del producto y SKU.')}
        {campo('bien.monto', 'Monto reclamado en soles (opcional)', (p) => (
          <input {...p} type="number" inputMode="decimal" min={0} step="0.01" class={estiloCampo} value={datos.bien.monto ?? ''} onInput={(e) => bien('monto', e.currentTarget.value === '' ? null : Number(e.currentTarget.value))} />
        ))}
      </fieldset>

      <fieldset disabled={!listo} class="flex flex-col gap-4 rounded-lg border border-borde bg-white p-4 disabled:opacity-70">
        <legend class="px-1 font-semibold">3. Detalle</legend>
        <div class="flex flex-col gap-2 text-sm" role="radiogroup" aria-label="Tipo">
          <label class="flex items-start gap-2">
            <input type="radio" name="tipo" class="mt-1" checked={datos.tipo === 'reclamo'} onChange={() => setDatos((d) => ({ ...d, tipo: 'reclamo' }))} />
            <span>
              <strong>Reclamo:</strong> disconformidad con el producto o servicio.
            </span>
          </label>
          <label class="flex items-start gap-2">
            <input type="radio" name="tipo" class="mt-1" checked={datos.tipo === 'queja'} onChange={() => setDatos((d) => ({ ...d, tipo: 'queja' }))} />
            <span>
              <strong>Queja:</strong> malestar con la atención, no relacionado con el producto o servicio.
            </span>
          </label>
        </div>
        {campo('detalle', 'Cuéntanos qué pasó', (p) => (
          <textarea {...p} rows={5} maxLength={2000} class={estiloCampo} value={datos.detalle} onInput={(e) => setDatos((d) => ({ ...d, detalle: e.currentTarget.value }))} />
        ))}
        {campo('pedido', '¿Qué solicitas a la tienda?', (p) => (
          <textarea {...p} rows={3} maxLength={1000} class={estiloCampo} value={datos.pedido} onInput={(e) => setDatos((d) => ({ ...d, pedido: e.currentTarget.value }))} />
        ))}
      </fieldset>

      {/* Campo trampa para bots: oculto para personas y lectores de pantalla. */}
      <div aria-hidden="true" class="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          No completar
          <input tabIndex={-1} autoComplete="off" value={trampa} onInput={(e) => setTrampa(e.currentTarget.value)} />
        </label>
      </div>

      <div class="flex flex-col gap-1">
        <label class="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            class="mt-1"
            checked={datos.declaracion}
            disabled={!listo}
            aria-invalid={errores.declaracion ? true : undefined}
            onChange={(e) => setDatos((d) => ({ ...d, declaracion: e.currentTarget.checked }))}
          />
          <span>
            Declaro que los datos son verdaderos y acepto que se usen solo para atender este reclamo, según la{' '}
            <a href="/legal/privacidad" class="underline" target="_blank" rel="noopener">política de privacidad</a>.
          </span>
        </label>
        {errores.declaracion && <p class="text-sm text-agotado">{errores.declaracion}</p>}
      </div>

      <button
        type="submit"
        disabled={enviando || !listo}
        class="rounded-md bg-marca px-4 py-3 font-semibold text-white hover:bg-marca-oscuro disabled:cursor-wait disabled:opacity-60 sm:w-fit"
      >
        {enviando ? 'Enviando…' : `Enviar ${datos.tipo}`}
      </button>
    </form>
  )
}
