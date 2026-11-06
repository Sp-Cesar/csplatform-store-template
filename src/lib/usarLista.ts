// Hook de Preact que comparte la lista entre islas y pestañas. Núcleo compartido: no editar por cliente.

import { useCallback, useEffect, useState } from 'preact/hooks'
import { slugTienda } from './sitio'
import { EVENTO_LISTA, guardarLista, leerLista, type ElementoLista } from './lista'

// Copia en memoria compartida por todas las islas de la página. Mantiene la lista aunque el
// navegador bloquee localStorage (modo privado estricto).
let memoria: ElementoLista[] | null = null

function actual(): ElementoLista[] {
  memoria ??= leerLista(slugTienda)
  return memoria
}

export function usarLista() {
  // Empieza vacía para que el HTML del servidor y el del navegador coincidan; se lee al montar.
  const [lista, setLista] = useState<ElementoLista[]>([])
  const [cargada, setCargada] = useState(false)

  useEffect(() => {
    setLista(actual())
    setCargada(true)
    const alCambiar = (e: Event) => setLista((e as CustomEvent<ElementoLista[]>).detail)
    const alCambiarOtraPestana = (e: StorageEvent) => {
      if (e.key !== `lista:${slugTienda}` && e.key !== null) return
      memoria = leerLista(slugTienda)
      setLista(memoria)
    }
    addEventListener(EVENTO_LISTA, alCambiar)
    addEventListener('storage', alCambiarOtraPestana)
    return () => {
      removeEventListener(EVENTO_LISTA, alCambiar)
      removeEventListener('storage', alCambiarOtraPestana)
    }
  }, [])

  /** Recibe la lista nueva o una función que la calcula a partir de la última. */
  const actualizar = useCallback((cambio: ElementoLista[] | ((anterior: ElementoLista[]) => ElementoLista[])) => {
    memoria = typeof cambio === 'function' ? cambio(actual()) : cambio
    guardarLista(slugTienda, memoria)
  }, [])

  return { lista, cargada, actualizar }
}
