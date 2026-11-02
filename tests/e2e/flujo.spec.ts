// Flujo principal del comprador: catálogo → lista → pedido por WhatsApp (plan, sección 7.8).
import { expect, test } from '@playwright/test'
import { capturarWhatsapp, vaciarLista } from './ayudas'

test.beforeEach(async ({ page }) => {
  await vaciarLista(page)
})

test('busca, agrega desde el catálogo y el detalle, y envía el pedido por WhatsApp', async ({ page }) => {
  const whatsapp = await capturarWhatsapp(page)

  // Portada → catálogo con búsqueda.
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Tienda Demo' })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Buscar productos' }).fill('lenovo')
  await page.getByRole('button', { name: 'Buscar' }).click()
  await expect(page).toHaveURL(/\/productos\?q=lenovo/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Resultados para "lenovo"')
  await expect(page.getByText('2 productos')).toBeVisible()

  // Agregar desde la tarjeta: el agotado no se puede agregar.
  const ideapad = page.getByRole('listitem').filter({ hasText: 'LAP-001' })
  await expect(page.getByRole('listitem').filter({ hasText: 'LAP-003' }).getByRole('button', { name: 'Agotado' })).toBeDisabled()
  await ideapad.getByRole('button', { name: 'Agregar' }).click()
  await expect(page.getByRole('link', { name: 'Mi lista, 1 unidad' })).toBeVisible()

  // Detalle: agregar 2 unidades de otro producto.
  await page.goto('/productos/MON-030')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Monitor Samsung 24" Full HD')
  await expect(page.getByText('Disponible', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Agregar una unidad' }).click()
  await page.getByRole('button', { name: 'Agregar a mi lista' }).click()
  await expect(page.getByText('Tienes 2 en tu lista')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Mi lista, 3 unidades' })).toBeVisible()

  // Lista: total, datos del comprador y envío.
  await page.getByRole('link', { name: 'Ver lista' }).click()
  await expect(page).toHaveURL(/\/lista$/)
  await expect(page.getByText('S/ 3,598.00')).toBeVisible()
  await page.getByLabel('Tu nombre (opcional)').fill('Ana Pérez')
  await page.getByLabel('Delivery (coordinar costo)').check()
  await page.getByRole('button', { name: 'Pedir por WhatsApp' }).click()

  await expect.poll(whatsapp).not.toBeNull()
  const enlace = whatsapp()!
  expect(enlace.pathname).toBe('/51999999999')
  expect(enlace.searchParams.get('text')).toBe(
    [
      'Hola, quiero hacer este pedido desde la web:',
      '1 x Laptop Lenovo IdeaPad 3 15" (LAP-001) - S/ 2,500.00',
      '2 x Monitor Samsung 24" Full HD (MON-030) - S/ 1,098.00',
      'Total referencial: S/ 3,598.00',
      'Nombre: Ana Pérez',
      'Entrega: Delivery (coordinar costo)',
    ].join('\n'),
  )
})

test('la lista sobrevive a la recarga y permite cambiar cantidades y quitar', async ({ page }) => {
  await page.goto('/productos/MOU-010')
  await page.getByRole('button', { name: 'Agregar a mi lista' }).click()
  await expect(page.getByText('Tienes 1 en tu lista')).toBeVisible()
  await page.goto('/lista')
  await page.reload()

  const fila = page.getByRole('listitem').filter({ hasText: 'MOU-010' })
  await expect(fila).toBeVisible()
  await fila.getByRole('button', { name: 'Agregar una unidad' }).click()
  await expect(fila.getByText('S/ 120.00')).toBeVisible()
  await fila.getByRole('button', { name: /Quitar Mouse/ }).click()
  await expect(page.getByText('Tu lista está vacía.')).toBeVisible()
})

test('al abrir la lista corrige precios viejos y quita lo agotado', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() =>
    localStorage.setItem(
      'lista:demo',
      JSON.stringify([
        { sku: 'LAP-001', nombre: 'Laptop vieja', precio: 2600, cantidad: 1 },
        { sku: 'LAP-003', nombre: 'Laptop Lenovo ThinkPad E14', precio: 3650, cantidad: 1 },
        { sku: 'BORRADO-1', nombre: 'Producto retirado', precio: 10, cantidad: 1 },
      ]),
    ),
  )
  await page.goto('/lista')

  const aviso = page.getByRole('status').filter({ hasText: 'Tu lista se actualizó' })
  await expect(aviso).toContainText('el precio cambió de S/ 2,600.00 a S/ 2,500.00')
  await expect(aviso).toContainText('Laptop Lenovo ThinkPad E14 se agotó')
  await expect(aviso).toContainText('Producto retirado ya no está en el catálogo')
  await expect(page.getByRole('listitem').filter({ hasText: 'LAP-001' })).toContainText('Laptop Lenovo IdeaPad 3 15"')
  await expect(page.getByText('S/ 2,500.00').first()).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'LAP-003' })).toHaveCount(0)
})

test('consultar un producto abre WhatsApp con su nombre y SKU', async ({ page }) => {
  await page.goto('/productos/RED-040')
  const consulta = page.getByRole('link', { name: 'Consultar por WhatsApp' })
  const href = new URL((await consulta.getAttribute('href'))!)
  expect(href.searchParams.get('text')).toBe('Hola, quiero consultar por este producto: Router TP-Link Archer C6 (RED-040)')
})

test('filtra por categoría, ordena, quita filtros y maneja páginas fuera de rango', async ({ page }) => {
  await page.goto('/productos')
  await expect(page.getByText('13 productos')).toBeVisible()

  await page.getByLabel('Categoría').selectOption({ label: 'Monitores (3)' })
  await expect(page).toHaveURL(/categoria=cat-monitores/)
  await expect(page.getByText('3 productos')).toBeVisible()

  await page.getByLabel('Ordenar por').selectOption('precio_asc')
  await expect(page).toHaveURL(/orden=precio_asc/)
  await expect(page.locator('article').getByText(/^S\/ /)).toHaveText(['S/ 399.00', 'S/ 549.00', 'S/ 899.00'])

  await page.getByRole('link', { name: 'Quitar filtro Monitores' }).click()
  await expect(page.getByText('13 productos')).toBeVisible()

  await page.goto('/productos?pagina=99')
  await expect(page.getByText('No encontramos productos con esos filtros.')).toBeVisible()
})
