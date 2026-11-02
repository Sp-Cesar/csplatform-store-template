// Enlace a la lista con la cantidad de unidades. Diseño libre por cliente.
import { unidades } from '../../lib/lista'
import { usarLista } from '../../lib/usarLista'

export default function ContadorLista() {
  const { lista } = usarLista()
  const n = unidades(lista)
  return (
    <a
      href="/lista"
      class="relative inline-flex items-center gap-2 rounded-full border border-borde px-3 py-1.5 text-sm font-medium hover:border-marca"
      aria-label={n > 0 ? `Mi lista, ${n} ${n === 1 ? 'unidad' : 'unidades'}` : 'Mi lista, vacía'}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="10" cy="20" r="1.3" />
        <circle cx="17" cy="20" r="1.3" />
      </svg>
      <span>Mi lista</span>
      {n > 0 && (
        <span class="min-w-5 rounded-full bg-marca px-1.5 text-center text-xs font-semibold text-white" aria-hidden="true">
          {n}
        </span>
      )}
    </a>
  )
}
