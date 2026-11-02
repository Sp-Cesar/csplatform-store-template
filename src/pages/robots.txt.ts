// robots.txt: permite indexar el catálogo y apunta al sitemap. Núcleo compartido: no editar por cliente.
import type { APIRoute } from 'astro'

export const GET: APIRoute = ({ site, url }) => {
  const base = site ?? new URL(url.origin)
  const cuerpo = ['User-agent: *', 'Allow: /', 'Disallow: /lista', '', `Sitemap: ${new URL('/sitemap.xml', base).href}`, ''].join('\n')
  return new Response(cuerpo, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, s-maxage=86400' },
  })
}
