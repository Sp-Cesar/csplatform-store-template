# Instrucciones para agentes de IA

Este repositorio es la **plantilla de vitrina web de CSPlatform**: una web de catálogo de solo lectura (Astro 7 +
Preact + Tailwind 4, en Vercel) conectada al SaaS por funciones RPC `web_*` de Supabase.

**Antes de cambiar código, lee `PLANTILLA.md`** (componentes, seguridad, contrato de datos y recetas).
Para instalar, crear un cliente o desplegar: `README.md`.

## Reglas obligatorias

1. Responde y escribe código, comentarios y textos en **español**.
2. **Solo lectura:** la web no escribe en el backend, salvo `registrarReclamo` (Libro de Reclamaciones, legal).
   No agregues otras escrituras, tablas ni claves. La `service_role` jamás se usa aquí.
3. **La clave del backend vive solo en el servidor** (`SUPABASE_ANON_KEY`, sin `PUBLIC_`). Nunca importes
   `src/lib/conexion.ts` en una isla: las islas usan `src/lib/clienteApi.ts` (endpoints `/api/*`).
4. **No edites `src/lib/` ni `src/pages/api/`** en una copia de cliente: es el núcleo compartido. Solo se cambia en
   la plantilla, con pruebas.
5. Usa solo los campos del contrato (`src/lib/tipos.ts`, `PLANTILLA.md` sección 4). **Nunca** muestres cantidades de
   stock, costos, sedes ni datos de clientes.
6. Llama al backend solo con `backend()` de `src/lib/conexion.ts`, desde páginas o endpoints, con el patrón
   `cargarTienda()` → `aplicarCache()` → `intentar()`. Nunca `fetch` directo a Supabase.
7. Endpoints nuevos: `mismoOrigen`, `limitePorVisitante`, `leerJson` y `respuestaJson` de `src/lib/api.ts`.
8. Nunca insertes HTML sin escapar con datos del backend. JSON dentro de `<script>`: `jsonParaScript()`.
9. Nunca envíes datos personales a la analítica, los logs, la URL ni `localStorage`.
10. Nunca escribas, inventes ni imprimas claves. Para desarrollar usa el modo demo (`PUBLIC_MODO_DEMO=true`).
11. Botones y campos de una isla nacen desactivados hasta que la isla carga.
12. Colores solo con los tokens de `src/styles/global.css`. Diseño pensado primero para celular, sin scroll horizontal a 360 px.
13. No hagas commit ni push salvo que el dueño lo pida.

## Comandos

```bash
npm install
cp .env.example .env   # modo demo, sin backend
npm run dev            # http://localhost:4321 (si ya hay otro servidor: npx astro dev --ignore-lock --port 4330)
npm test               # unitarias del núcleo
npm run check          # tipos
npm run test:e2e       # Playwright en modo demo (primera vez: npx playwright install chromium)
npm run build          # compilación para Vercel
```

Las cuatro verificaciones (`test`, `check`, `test:e2e`, `build`) deben pasar antes de entregar.

## Mapa rápido

| Necesito… | Uso |
|---|---|
| Datos del backend (servidor) | `backend().tienda()`, `.filtros()`, `.productos(params)`, `.producto(sku)`, `.disponibilidad(skus)`, `.registrarReclamo(r)` |
| Datos desde una isla | `consultarDisponibilidad()`, `enviarReclamo()` en `src/lib/clienteApi.ts` |
| Registrar un error | `reportarError(e, contexto)` en `src/lib/conexion.ts` |
| Medir una acción | `registrarEvento()` en `src/lib/analitica.ts` o `data-umami-event` en un enlace |
| Validar un reclamo | `validarReclamo()` en `src/lib/reclamo.ts` |
| Tipos del contrato | `src/lib/tipos.ts` |
| Mostrar un precio | `formatearSoles()` en `src/lib/formato.ts` |
| Enlace a un producto o al catálogo | `rutaProducto()`, `urlCatalogo()` en `src/lib/catalogo.ts` |
| Lista del comprador en una isla | `usarLista()` en `src/lib/usarLista.ts` + funciones de `src/lib/lista.ts` |
| Enlace de WhatsApp | `enlaceWhatsapp()`, `mensajePedido()`, `mensajeConsulta()` en `src/lib/whatsapp.ts` |
| Layout con SEO y estado "no disponible" | `src/layouts/Tienda.astro` |
| Componentes existentes | `PLANTILLA.md` sección 2.1 |

Documentación de Astro: https://docs.astro.build
