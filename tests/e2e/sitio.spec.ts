// Estado "no disponible", SEO y calidad mínima del diseño base (plan, secciones 4 H5, 7.5 y 7.8).
import { expect, test } from '@playwright/test'
import { PUERTO_CERRADA } from '../../playwright.config'
import { tieneScrollHorizontal } from './ayudas'

const CERRADA = `http://localhost:${PUERTO_CERRADA}`

test.describe('tienda no disponible', () => {
  for (const ruta of ['/', '/productos', '/productos/LAP-001', '/lista']) {
    test(`${ruta} responde 503 sin productos`, async ({ page }) => {
      const respuesta = await page.goto(CERRADA + ruta)
      expect(respuesta?.status()).toBe(503)
      expect(respuesta?.headers()['cache-control']).toBe('no-store')
      await expect(page.getByText('Esta tienda no está disponible por ahora.')).toBeVisible()
      await expect(page.locator('article')).toHaveCount(0)
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
    })
  }

  test('el sitemap tampoco lista productos', async ({ request }) => {
    expect((await request.get(`${CERRADA}/sitemap.xml`)).status()).toBe(503)
  })
})

test.describe('SEO', () => {
  test('las páginas públicas se cachean 60 s en el CDN', async ({ request }) => {
    const respuesta = await request.get('/productos')
    expect(respuesta.headers()['cache-control']).toBe('public, s-maxage=60, stale-while-revalidate=300')
  })

  test('el detalle trae título, Open Graph y datos estructurados', async ({ page }) => {
    await page.goto('/productos/LAP-001')
    await expect(page).toHaveTitle('Laptop Lenovo IdeaPad 3 15" | Tienda Demo')
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Laptop Lenovo IdeaPad/)
    const datos = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!)
    expect(datos).toMatchObject({
      '@type': 'Product',
      sku: 'LAP-001',
      offers: { price: '2500.00', priceCurrency: 'PEN', availability: 'https://schema.org/InStock' },
    })
  })

  test('un SKU inexistente responde 404 sin caché', async ({ page }) => {
    const respuesta = await page.goto('/productos/NO-EXISTE')
    expect(respuesta?.status()).toBe(404)
    expect(respuesta?.headers()['cache-control']).toBe('no-store')
    await expect(page.getByText('Este producto no está disponible en la web.')).toBeVisible()
  })

  test('una ruta inexistente responde 404', async ({ page }) => {
    expect((await page.goto('/no-existe'))?.status()).toBe(404)
  })

  test('sitemap.xml lista la portada, el catálogo y cada producto', async ({ request }) => {
    const respuesta = await request.get('/sitemap.xml')
    expect(respuesta.headers()['content-type']).toContain('application/xml')
    const xml = await respuesta.text()
    expect(xml.match(/<loc>/g)).toHaveLength(19)
    expect(xml).toContain('/productos/LAP-001</loc>')
  })

  test('robots.txt apunta al sitemap y excluye la lista', async ({ request }) => {
    const texto = await (await request.get('/robots.txt')).text()
    expect(texto).toContain('Disallow: /lista')
    expect(texto).toMatch(/Sitemap: http:\/\/localhost:\d+\/sitemap\.xml/)
  })
})

test.describe('diseño en celular', () => {
  for (const ancho of [360, 390, 430]) {
    test(`sin scroll horizontal a ${ancho} px`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 800 })
      for (const ruta of ['/', '/productos', '/productos/LAP-001', '/lista']) {
        await page.goto(ruta)
        expect(await tieneScrollHorizontal(page), `scroll horizontal en ${ruta}`).toBe(false)
      }
    })
  }

  test('todas las imágenes tienen alt y el foco es visible', async ({ page }) => {
    await page.goto('/productos')
    expect(await page.locator('img:not([alt])').count()).toBe(0)
    await page.keyboard.press('Tab')
    const contorno = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle)
    expect(contorno).not.toBe('none')
  })
})
