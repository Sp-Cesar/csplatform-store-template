// Libro de Reclamaciones, páginas legales y endpoints propios (/api/*).
import { expect, test } from '@playwright/test'

test.describe('Libro de Reclamaciones', () => {
  test('está enlazado en el pie y muestra los datos del proveedor', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Libro de Reclamaciones' }).click()
    await expect(page).toHaveURL(/\/libro-de-reclamaciones$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Libro de Reclamaciones')
    await expect(page.getByText('Tienda Demo S.A.C.', { exact: true })).toBeVisible()
    await expect(page.getByText('20000000001', { exact: true })).toBeVisible()
  })

  test('valida los campos antes de enviar', async ({ page }) => {
    await page.goto('/libro-de-reclamaciones')
    await page.getByRole('button', { name: 'Enviar reclamo' }).click()
    await expect(page.getByText('Completa este campo.').first()).toBeVisible()
    await expect(page.getByText('Número de DNI no válido.')).toBeVisible()
    await expect(page.getByText('Debes confirmar que los datos son verdaderos.')).toBeVisible()
  })

  test('registra un reclamo y entrega la constancia', async ({ page }) => {
    await page.goto('/libro-de-reclamaciones')
    await page.getByLabel('Nombres y apellidos').fill('Ana Pérez')
    await page.getByLabel('Número de documento').fill('12345678')
    await page.getByLabel('Domicilio').fill('Av. Siempre Viva 123, Lima')
    await page.getByLabel('Teléfono').fill('987654321')
    await page.getByLabel('Correo electrónico').fill('ana@correo.pe')
    await page.getByLabel('Descripción').fill('Laptop LAP-001')
    await page.getByLabel('Queja:').check()
    await page.getByLabel('Cuéntanos qué pasó').fill('Me atendieron con demora en la tienda.')
    await page.getByLabel('¿Qué solicitas a la tienda?').fill('Mejorar la atención')
    await page.getByLabel(/Declaro que los datos son verdaderos/).check()
    await page.getByRole('button', { name: 'Enviar queja' }).click()

    await expect(page.getByRole('heading', { name: 'Registramos tu queja' })).toBeVisible()
    await expect(page.getByText(/^DEMO-\d{4}-\d{6}$/)).toBeVisible()
    await expect(page.getByText('ana@correo.pe')).toBeVisible()
  })
})

test.describe('páginas legales', () => {
  for (const [ruta, titulo] of [
    ['/legal/terminos', 'Términos y condiciones'],
    ['/legal/privacidad', 'Política de privacidad'],
    ['/legal/cambios-y-devoluciones', 'Cambios y devoluciones'],
  ]) {
    test(`${titulo} está enlazada en el pie`, async ({ page }) => {
      await page.goto('/')
      await page.getByRole('navigation', { name: 'Información legal' }).getByRole('link', { name: titulo }).click()
      await expect(page).toHaveURL(new RegExp(`${ruta}$`))
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(titulo)
      await expect(page.getByRole('note')).toContainText('Texto base de la plantilla')
    })
  }
})

test.describe('endpoints propios', () => {
  test('la clave del backend nunca llega al navegador', async ({ page }) => {
    const textos: string[] = []
    page.on('response', async (r) => {
      if (/\.(js|mjs|css)(\?|$)/.test(r.url()) || r.request().resourceType() === 'document') textos.push(await r.text().catch(() => ''))
    })
    await page.goto('/lista')
    await page.goto('/productos/LAP-001')
    await page.waitForLoadState('networkidle')
    const todo = textos.join('\n')
    expect(todo).not.toContain('SUPABASE')
    expect(todo).not.toContain('supabase.co')
  })

  test('/api/disponibilidad responde y rechaza otros sitios y datos inválidos', async ({ request, baseURL }) => {
    const ok = await request.post('/api/disponibilidad', { headers: { origin: baseURL! }, data: { skus: ['LAP-003'] } })
    expect(ok.status()).toBe(200)
    expect(await ok.json()).toEqual([{ sku: 'LAP-003', nombre: 'Laptop Lenovo ThinkPad E14', precio: 3650, disponible: false }])
    expect(ok.headers()['cache-control']).toBe('no-store')

    const otroSitio = await request.post('/api/disponibilidad', { headers: { origin: 'https://otro-sitio.com' }, data: { skus: [] } })
    expect(otroSitio.status()).toBe(403)

    const invalido = await request.post('/api/disponibilidad', { headers: { origin: baseURL! }, data: { skus: 'LAP-001' } })
    expect(invalido.status()).toBe(400)
  })

  test('/api/reclamos valida en el servidor y bloquea bots', async ({ request, baseURL }) => {
    const incompleto = await request.post('/api/reclamos', { headers: { origin: baseURL! }, data: { tipo: 'reclamo' } })
    expect(incompleto.status()).toBe(422)
    expect((await incompleto.json()).errores['consumidor.email']).toBe('Correo no válido.')

    const bot = await request.post('/api/reclamos', { headers: { origin: baseURL! }, data: { trampa: 'http://spam' } })
    expect(bot.status()).toBe(400)
  })
})
