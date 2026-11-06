// Lista del comprador y envío del pedido por WhatsApp. Diseño libre por cliente.
// Al abrirse y antes de enviar, refresca precios y disponibilidad con /api/disponibilidad (el servidor
// consulta web_disponibilidad; la clave del backend nunca llega al navegador).
import { useEffect, useState } from 'preact/hooks'
import { rutaProducto } from '../../lib/catalogo'
import { registrarEvento } from '../../lib/analitica'
import { consultarDisponibilidad } from '../../lib/clienteApi'
import { formatearSoles } from '../../lib/formato'
import { CANTIDAD_MAXIMA, cambiarCantidad, quitar, refrescar, totalLista, unidades, type Cambio, type ElementoLista } from '../../lib/lista'
import { usarLista } from '../../lib/usarLista'
import { enlaceWhatsapp, mensajePedido } from '../../lib/whatsapp'

interface Props {
  whatsapp: string | null
  telefono: string | null
  email: string | null
  opcionesEntrega: string[]
}

type Estado = 'cargando' | 'listo' | 'error'

function textoCambio(c: Cambio): string {
  if (c.tipo === 'precio') return `${c.nombre}: el precio cambió de ${formatearSoles(c.antes)} a ${formatearSoles(c.ahora)}.`
  if (c.tipo === 'agotado') return `${c.nombre} se agotó y salió de tu lista.`
  return `${c.nombre} ya no está en el catálogo y salió de tu lista.`
}

export default function Lista({ whatsapp, telefono, email, opcionesEntrega }: Props) {
  const { lista, cargada, actualizar } = usarLista()
  const [estado, setEstado] = useState<Estado>('cargando')
  const [cambios, setCambios] = useState<Cambio[]>([])
  const [nombre, setNombre] = useState('')
  const [entrega, setEntrega] = useState(opcionesEntrega[0] ?? '')
  const [enviando, setEnviando] = useState(false)
  const [copiado, setCopiado] = useState(false)

  /** Trae datos frescos, actualiza la lista y devuelve los cambios. null si no se pudo. */
  async function refrescarDesdeBackend(actual: ElementoLista[]): Promise<{ lista: ElementoLista[]; cambios: Cambio[] } | null> {
    if (actual.length === 0) return { lista: [], cambios: [] }
    try {
      const frescos = await consultarDisponibilidad(actual.map((e) => e.sku))
      const resultado = refrescar(actual, frescos)
      actualizar(resultado.lista)
      return resultado
    } catch (e) {
      console.error(e)
      return null
    }
  }

  useEffect(() => {
    if (!cargada) return
    refrescarDesdeBackend(lista).then((r) => {
      setEstado(r ? 'listo' : 'error')
      if (r) setCambios(r.cambios)
    })
    // Solo al abrir la página.
  }, [cargada])

  async function alEnviar(e: Event) {
    e.preventDefault()
    setEnviando(true)
    const r = await refrescarDesdeBackend(lista)
    setEnviando(false)
    if (!r) {
      setEstado('error')
      return
    }
    setEstado('listo')
    setCambios(r.cambios)
    if (r.cambios.length > 0 || r.lista.length === 0) return // El comprador revisa antes de enviar.
    const enlace = enlaceWhatsapp(whatsapp, mensajePedido({ elementos: r.lista, nombre, entrega }))
    if (!enlace) return
    registrarEvento({
      nombre: 'pedido-whatsapp',
      datos: { productos: r.lista.length, unidades: unidades(r.lista), total: totalLista(r.lista) },
    })
    location.href = enlace
  }

  async function alCopiar() {
    try {
      await navigator.clipboard.writeText(mensajePedido({ elementos: lista, nombre, entrega }))
      setCopiado(true)
    } catch {
      setCopiado(false)
    }
  }

  if (!cargada) return <p class="py-10 text-center text-suave">Cargando tu lista…</p>

  if (lista.length === 0) {
    return (
      <div class="py-10 text-center">
        {cambios.length > 0 && <Avisos cambios={cambios} reenviar={false} />}
        <p class="text-lg font-medium">Tu lista está vacía.</p>
        <a href="/productos" class="mt-4 inline-block rounded-md bg-marca px-4 py-2 font-semibold text-white hover:bg-marca-oscuro">
          Ver productos
        </a>
      </div>
    )
  }

  const tieneWhatsapp = enlaceWhatsapp(whatsapp, '') !== null
  const bloqueado = estado !== 'listo' || enviando

  return (
    <div class="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <section aria-labelledby="titulo-productos">
        <h2 id="titulo-productos" class="sr-only">
          Productos
        </h2>
        {cambios.length > 0 && <Avisos cambios={cambios} reenviar />}
        {estado === 'error' && (
          <p role="alert" class="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
            No pudimos actualizar precios y disponibilidad. Revisa tu conexión e{' '}
            <button type="button" class="font-semibold underline" onClick={() => location.reload()}>
              inténtalo de nuevo
            </button>
            .
          </p>
        )}
        <ul class="divide-y divide-borde rounded-lg border border-borde bg-white">
          {lista.map((e) => (
            <li key={e.sku} class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div class="flex-1">
                <a href={rutaProducto(e.sku)} class="font-medium hover:underline">
                  {e.nombre}
                </a>
                <p class="text-sm text-suave">
                  SKU {e.sku} · {formatearSoles(e.precio)} c/u
                </p>
              </div>
              <div class="flex items-center justify-between gap-4">
                <div class="flex items-center rounded-md border border-borde" role="group" aria-label={`Cantidad de ${e.nombre}`}>
                  <button
                    type="button"
                    class="h-9 w-9"
                    onClick={() => actualizar((a) => cambiarCantidad(a, e.sku, e.cantidad - 1))}
                    aria-label="Quitar una unidad"
                  >
                    −
                  </button>
                  <span class="w-9 text-center tabular-nums" aria-live="polite">
                    {e.cantidad}
                  </span>
                  <button
                    type="button"
                    class="h-9 w-9 disabled:opacity-40"
                    disabled={e.cantidad >= CANTIDAD_MAXIMA}
                    onClick={() => actualizar((a) => cambiarCantidad(a, e.sku, e.cantidad + 1))}
                    aria-label="Agregar una unidad"
                  >
                    +
                  </button>
                </div>
                <span class="w-28 text-right font-semibold tabular-nums">{formatearSoles(e.precio * e.cantidad)}</span>
                <button
                  type="button"
                  class="text-sm text-suave underline hover:text-agotado"
                  onClick={() => actualizar((a) => quitar(a, e.sku))}
                  aria-label={`Quitar ${e.nombre} de la lista`}
                >
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <form onSubmit={alEnviar} class="flex h-fit flex-col gap-4 rounded-lg border border-borde bg-white p-4 lg:sticky lg:top-4">
        <div class="flex items-baseline justify-between">
          <span class="text-suave">
            Total referencial ({unidades(lista)} {unidades(lista) === 1 ? 'unidad' : 'unidades'})
          </span>
          <span class="text-xl font-semibold tabular-nums">{formatearSoles(totalLista(lista))}</span>
        </div>
        <p class="text-xs text-suave">El precio final y la entrega se confirman con la tienda por WhatsApp.</p>

        <label class="flex flex-col gap-1 text-sm font-medium">
          Tu nombre (opcional)
          <input
            type="text"
            value={nombre}
            maxLength={60}
            autoComplete="name"
            onInput={(ev) => setNombre(ev.currentTarget.value)}
            class="rounded-md border border-borde px-3 py-2 font-normal"
          />
        </label>

        {opcionesEntrega.length > 0 && (
          <fieldset class="flex flex-col gap-1 text-sm">
            <legend class="mb-1 font-medium">Entrega</legend>
            {opcionesEntrega.map((opcion) => (
              <label key={opcion} class="flex items-center gap-2">
                <input type="radio" name="entrega" value={opcion} checked={entrega === opcion} onChange={() => setEntrega(opcion)} />
                {opcion}
              </label>
            ))}
          </fieldset>
        )}

        {tieneWhatsapp ? (
          <button
            type="submit"
            disabled={bloqueado}
            class="rounded-md bg-[#1f8f4e] px-4 py-3 font-semibold text-white hover:bg-[#187a41] disabled:cursor-wait disabled:opacity-60"
          >
            {estado === 'cargando' ? 'Actualizando precios…' : enviando ? 'Revisando…' : 'Pedir por WhatsApp'}
          </button>
        ) : (
          <div class="flex flex-col gap-2 text-sm">
            <p>Envía tu pedido a la tienda:</p>
            {telefono && (
              <a href={`tel:${telefono.replace(/\s/g, '')}`} class="font-medium text-marca underline">
                Llamar al {telefono}
              </a>
            )}
            {email && (
              <a
                href={`mailto:${email}?subject=${encodeURIComponent('Pedido desde la web')}&body=${encodeURIComponent(mensajePedido({ elementos: lista, nombre, entrega }))}`}
                class="font-medium text-marca underline"
              >
                Escribir a {email}
              </a>
            )}
            <button type="button" onClick={alCopiar} class="rounded-md border border-borde px-3 py-2 font-medium">
              {copiado ? 'Pedido copiado ✓' : 'Copiar pedido'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}

function Avisos({ cambios, reenviar }: { cambios: Cambio[]; reenviar: boolean }) {
  return (
    <div role="status" class="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-left text-sm">
      <p class="font-semibold">Tu lista se actualizó:</p>
      <ul class="mt-1 list-disc pl-5">
        {cambios.map((c) => (
          <li key={`${c.tipo}-${c.sku}`}>{textoCambio(c)}</li>
        ))}
      </ul>
      {reenviar && <p class="mt-1">Revisa tu lista antes de enviar el pedido.</p>}
    </div>
  )
}
