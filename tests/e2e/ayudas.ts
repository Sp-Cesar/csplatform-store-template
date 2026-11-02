import type { Page } from '@playwright/test'

/**
 * Intercepta la salida a WhatsApp para que la prueba no abandone el sitio.
 * Devuelve una función que entrega el último enlace wa.me pedido.
 */
export async function capturarWhatsapp(page: Page): Promise<() => URL | null> {
  let ultimo: URL | null = null
  await page.route('https://wa.me/**', (ruta) => {
    ultimo = new URL(ruta.request().url())
    return ruta.fulfill({ status: 200, contentType: 'text/html', body: '<p>WhatsApp (simulado)</p>' })
  })
  return () => ultimo
}

/** Empieza cada prueba con la lista vacía. */
export async function vaciarLista(page: Page) {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('prueba-iniciada')) {
      localStorage.clear()
      sessionStorage.setItem('prueba-iniciada', '1')
    }
  })
}

/** true si la página tiene scroll horizontal (algo se sale del ancho). */
export function tieneScrollHorizontal(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
}
