// Agrega un producto a la lista. Versión compacta para tarjetas y completa (con cantidad) para el detalle.
// Diseño libre por cliente.
import { useState } from 'preact/hooks'
import { CANTIDAD_MAXIMA, agregar } from '../../lib/lista'
import { usarLista } from '../../lib/usarLista'

interface Props {
  sku: string
  nombre: string
  precio: number
  disponible: boolean
  compacto?: boolean
}

export default function BotonAgregar({ sku, nombre, precio, disponible, compacto = false }: Props) {
  // cargada = el JavaScript ya tomó el control. Antes de eso el botón va desactivado para que un
  // toque temprano no se pierda en silencio (pasa en celulares con red lenta).
  const { lista, cargada, actualizar } = usarLista()
  const [cantidad, setCantidad] = useState(1)
  const [agregado, setAgregado] = useState(false)
  const enLista = lista.find((e) => e.sku === sku)?.cantidad ?? 0

  if (!disponible) {
    return (
      <button type="button" disabled class="w-full cursor-not-allowed rounded-md bg-stone-200 px-3 py-2 text-sm font-medium text-suave">
        Agotado
      </button>
    )
  }

  const alAgregar = () => {
    actualizar((anterior) => agregar(anterior, { sku, nombre, precio }, compacto ? 1 : cantidad))
    setAgregado(true)
    setTimeout(() => setAgregado(false), 2000)
  }

  const boton = (
    <button
      type="button"
      onClick={alAgregar}
      disabled={!cargada}
      class="flex-1 rounded-md bg-marca px-3 py-2 text-sm font-semibold text-white hover:bg-marca-oscuro disabled:cursor-wait disabled:opacity-70"
    >
      {agregado ? 'Agregado ✓' : compacto ? 'Agregar' : 'Agregar a mi lista'}
    </button>
  )

  if (compacto) return <div class="flex">{boton}</div>

  const cambiar = (n: number) => setCantidad(Math.min(Math.max(n, 1), CANTIDAD_MAXIMA))

  return (
    <div class="flex flex-col gap-2">
      <div class="flex gap-2">
        <div class="flex items-center rounded-md border border-borde bg-white" role="group" aria-label="Cantidad">
          <button type="button" class="h-10 w-10 text-lg" disabled={!cargada} onClick={() => cambiar(cantidad - 1)} aria-label="Quitar una unidad">
            −
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={CANTIDAD_MAXIMA}
            value={cantidad}
            disabled={!cargada}
            onInput={(e) => cambiar(Number.parseInt(e.currentTarget.value, 10) || 1)}
            class="h-10 w-12 border-x border-borde text-center [appearance:textfield]"
            aria-label="Cantidad"
          />
          <button type="button" class="h-10 w-10 text-lg" disabled={!cargada} onClick={() => cambiar(cantidad + 1)} aria-label="Agregar una unidad">
            +
          </button>
        </div>
        {boton}
      </div>
      <p class="min-h-5 text-sm text-suave" aria-live="polite">
        {enLista > 0 && (
          <>
            Tienes {enLista} en tu lista ·{' '}
            <a href="/lista" class="font-medium text-marca underline">
              Ver lista
            </a>
          </>
        )}
      </p>
    </div>
  )
}
