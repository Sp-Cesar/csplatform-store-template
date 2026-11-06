// sitemap.xml con la portada, el catálogo y cada producto publicado. Núcleo compartido: no editar por cliente.
import type { APIRoute } from 'astro'
import { rutaProducto } from '../lib/catalogo'
import { backend, reportarError, SIN_CACHE } from '../lib/conexion'
import { LIMITE_PRODUCTOS } from '../lib/tipos'

/** Tope de seguridad: 100 llamadas de 48 = 4 800 productos. */
const MAXIMO_PAGINAS = 100

const escapar = (texto: string) =>
  texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

export const GET: APIRoute = async ({ site, url }) => {
  const base = site ?? new URL(url.origin)
  try {
    const tienda = await backend().tienda()
    if (!tienda) return new Response('No disponible', { status: 503, headers: { 'Cache-Control': SIN_CACHE } })

    const rutas = ['/', '/productos', '/libro-de-reclamaciones', '/legal/terminos', '/legal/privacidad', '/legal/cambios-y-devoluciones']
    for (let i = 0, total = Infinity; i < MAXIMO_PAGINAS && i * LIMITE_PRODUCTOS < total; i++) {
      const pagina = await backend().productos({ orden: 'nombre', limite: LIMITE_PRODUCTOS, desde: i * LIMITE_PRODUCTOS })
      total = pagina.total
      rutas.push(...pagina.filas.map((p) => rutaProducto(p.sku)))
    }

    const cuerpo = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...rutas.map((r) => `  <url><loc>${escapar(new URL(r, base).href)}</loc></url>`),
      '</urlset>',
    ].join('\n')

    return new Response(cuerpo, {
      // Cambia poco: se guarda una hora en el CDN.
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch (e) {
    await reportarError(e, { origen: 'sitemap' })
    return new Response('Error', { status: 503, headers: { 'Cache-Control': SIN_CACHE } })
  }
}

