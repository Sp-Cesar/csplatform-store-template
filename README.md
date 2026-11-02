# CSPlatform · Plantilla de vitrina web

Plantilla base para crear la web de catálogo de cada empresa que usa CSPlatform. La web **solo lee** el
backend (funciones `web_*` de Supabase): muestra los productos publicados con precio y "Disponible" o "Agotado",
y el comprador envía su lista por **WhatsApp**. No hay pagos, pedidos guardados ni cambios de stock: todo eso
se gestiona en el panel de CSPlatform.

Cada cliente tiene **su propio repositorio** creado desde esta plantilla, con diseño libre. Todas las copias
comparten el mismo núcleo (`src/lib/`), así que las mejoras de la plantilla se pueden traer a cualquier cliente.

Plan completo del proyecto: `plan-vitrina-web.md` en la carpeta común `constock-project`
(sección 7.2 contrato con el backend, 7.5 plantilla, 8 fases).

---

## 1. Empezar en 5 minutos

Requisitos: Node.js 22.23.4 o superior y npm.

```bash
npm install
cp .env.example .env
npm run dev
```

Abre `http://localhost:4321`. Con el `.env` de ejemplo la web arranca en **modo demo**: muestra 13 productos de
ejemplo sin conectarse a ningún backend. Sirve para diseñar y probar.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en `http://localhost:4321` |
| `npm test` | Pruebas unitarias del núcleo (`tests/unit`, Vitest) |
| `npm run test:e2e` | Pruebas de punta a punta en modo demo (`tests/e2e`, Playwright) |
| `npm run check` | Revisión de tipos de TypeScript y Astro |
| `npm run build` | Compilación para Vercel |

La primera vez que corras las pruebas de punta a punta instala el navegador: `npx playwright install chromium`.

## 2. Variables de entorno

| Variable | Uso |
|---|---|
| `PUBLIC_MODO_DEMO` | `true` usa datos de ejemplo. Vacío o `false` en producción |
| `PUBLIC_SUPABASE_URL` | `https://gmfjxazokphvccwcltkr.supabase.co` |
| `PUBLIC_SUPABASE_ANON_KEY` | Clave pública `anon` del proyecto Supabase |
| `PUBLIC_TIENDA_SLUG` | `slug` que el Centro de Control asignó a la empresa |
| `PUBLIC_SITIO_URL` | Dominio del cliente con `https://`, para SEO y `sitemap.xml` |

- La clave `anon` es pública por diseño: con ella solo se pueden ejecutar las funciones `web_*` de lectura.
- En Vercel las carga el dueño del proyecto. **Nunca** subas `.env` al repositorio (ya está en `.gitignore`).
- En modo demo, el slug `no-disponible` simula una web desactivada.

## 3. Cómo está organizado: núcleo y diseño

```
src/
  lib/                NÚCLEO. Igual en todas las copias. No se edita por cliente.
    tipos.ts            Tipos del contrato web_* (versión 1)
    backend.ts          Llamadas RPC a Supabase y límites del contrato
    demo.ts             Backend de ejemplo con la misma interfaz
    conexion.ts         Elige backend real o demo según el entorno; carga la tienda
    pagina.ts           Caché del CDN, 503 si la tienda no está disponible, errores del backend
    catalogo.ts         Filtros y direcciones del catálogo
    lista.ts            Lista del comprador en localStorage (lista:{slug})
    usarLista.ts        Hook de Preact que comparte la lista entre islas y pestañas
    whatsapp.ts         Mensaje del pedido y enlace wa.me
    formato.ts          Soles y especificaciones
  pages/sitemap.xml.ts, pages/robots.txt.ts   NÚCLEO

  config/tienda.ts    Textos de la marca                      ← se edita por cliente
  styles/global.css   Colores y tipografía (@theme)            ← se edita por cliente
  layouts/            Cabecera, pie, estado "no disponible"    ← diseño libre
  components/         Tarjetas, grilla, imagen, paginación     ← diseño libre
  components/islas/   ContadorLista, BotonAgregar, Lista       ← diseño libre (Preact)
  pages/              Portada, catálogo, detalle, lista, 404   ← diseño libre
tests/unit/           Pruebas del núcleo
tests/e2e/            Pruebas del recorrido del comprador
```

Páginas:

| Ruta | Qué muestra |
|---|---|
| `/` | Portada: categorías y novedades |
| `/productos?q=&categoria=&marca=&orden=&pagina=` | Catálogo con búsqueda, filtros, orden y paginación |
| `/productos/{SKU}` | Detalle, cantidad, "Agregar a mi lista" y "Consultar por WhatsApp" |
| `/lista` | Lista del comprador y "Pedir por WhatsApp" |
| `/sitemap.xml`, `/robots.txt` | SEO |

## 4. Crear la web de un cliente nuevo

Tiempo estimado: medio día de configuración más el diseño (1 a 2 días según el cliente).

**Antes de empezar, pide:** nombre comercial, logo, colores, textos de portada, dominio y número de WhatsApp.

1. **Repositorio.** En GitHub, en esta plantilla: **Use this template → Create a new repository**.
   Nombre sugerido: `web-{cliente}`. Clónalo y corre `npm install`.
2. **Probar en demo.** `cp .env.example .env` y `npm run dev`. Confirma que ves la Tienda Demo.
3. **Marca.** Edita `src/config/tienda.ts` (eslogan, descripción para Google, opciones de entrega) y los colores
   en `src/styles/global.css` (bloque `@theme`). El nombre, logo, teléfono y WhatsApp **no** se escriben en el
   código: vienen del backend.
4. **Diseño.** Cambia lo que quieras en `layouts/`, `components/` y `pages/`. Ver sección 5.
5. **Pruebas.** `npm test`, `npm run check`, `npm run test:e2e` y `npm run build` deben pasar.
   Si cambiaste textos que las pruebas buscan (por ejemplo "Pedir por WhatsApp"), ajusta `tests/e2e`.
6. **Centro de Control de CSPlatform.** En la ficha de la empresa: activar "Tienda web" y asignar el `slug`
   (3 a 40 caracteres: minúsculas, números y guiones).
7. **Probar con datos reales.** En tu `.env`: `PUBLIC_MODO_DEMO=false`, la clave `anon` y el `slug`.
   Corre `npm run dev` y revisa que aparezcan los productos que la empresa publicó.
8. **Vercel.** Crea el proyecto desde el repositorio del cliente, carga las variables de la sección 2
   (sin `PUBLIC_MODO_DEMO`) y despliega. Vercel detecta Astro solo.
9. **Dominio.** En Vercel → Settings → Domains conecta el dominio del cliente (o `{cliente}.constockplatform.com`).
   Actualiza `PUBLIC_SITIO_URL` con ese dominio y vuelve a desplegar.
10. **Empresa.** Pide al administrador que, en el panel, marque "Publicar en la web" en sus productos y configure
    el WhatsApp de la tienda.
11. **Revisión final.** Haz la lista de la sección 7 en un celular real y un pedido de prueba por WhatsApp.

## 5. Personalizar el diseño sin romper nada

Puedes cambiar libremente HTML, clases y estructura de `layouts/`, `components/` y `pages/`. Respeta estas reglas:

- **No edites `src/lib/`.** Si necesitas algo nuevo del núcleo, hazlo en la plantilla y tráelo (sección 9).
- **Toda página del servidor empieza igual** para que la caché y el estado "no disponible" funcionen:

  ```astro
  ---
  import Tienda from '../layouts/Tienda.astro'
  import { backend, cargarTienda } from '../lib/conexion'
  import { aplicarCache, intentar } from '../lib/pagina'

  const estado = await cargarTienda()
  aplicarCache(Astro.response, estado)
  const productos = await intentar(
    Astro.response,
    () => (estado.estado === 'ok' ? backend().productos({ limite: 12 }) : Promise.resolve({ total: 0, filas: [] })),
    { total: 0, filas: [] },
  )
  ---

  <Tienda estado={estado} titulo="Mi página">
    <!-- productos.ok es false si el backend falló: muestra <AvisoError /> -->
  </Tienda>
  ```

- **Islas:** `BotonAgregar` necesita `sku`, `nombre`, `precio` y `disponible`; `Lista` necesita los datos de
  contacto de la tienda. Puedes cambiar su HTML y estilos, pero mantén las llamadas a `usarLista()` y `agregar()`.
- **Nunca muestres cantidades de stock ni costos.** El backend no los envía y la web no debe inventarlos.
- **Imágenes:** usa `ImagenProducto.astro` (marcador si no hay foto) y `prioridad` solo en las primeras visibles.
- **Calidad mínima:** pensado primero para celular, sin scroll horizontal a 360, 390 y 430 px, contraste AA,
  foco visible, `alt` en las imágenes. Las pruebas `tests/e2e/sitio.spec.ts` revisan parte de esto.

## 6. Cómo funciona por dentro

- **Datos en tiempo real:** las páginas se generan en el servidor de Vercel y el CDN las guarda 60 s
  (`s-maxage=60, stale-while-revalidate=300`). Un cambio de precio en el panel aparece en la web en menos de un minuto.
- **Tienda no disponible:** si el Centro de Control desactiva la web o la membresía de la empresa vence,
  `web_tienda` devuelve `null`. Todas las páginas responden 503 sin caché, con el mensaje "Esta tienda no está
  disponible por ahora" y `noindex`.
- **Lista del comprador:** vive en el navegador (`localStorage`, clave `lista:{slug}`), sin cuenta. Al abrir
  `/lista` y otra vez al pulsar "Pedir por WhatsApp" se consultan precios y stock con `web_disponibilidad`; si
  algo cambió, se avisa y no se envía hasta que el comprador revise.
- **Pedido:** se arma el mensaje (productos, cantidades, subtotales, total referencial, nombre y entrega) y se
  abre `https://wa.me/{whatsapp}`. No se guarda nada en el backend. Si la tienda no tiene WhatsApp, se ofrecen
  teléfono, correo y "Copiar pedido".
- **Contrato versionado:** cada respuesta de `web_tienda` trae `version_contrato`. Si el backend publica una
  versión mayor, la consola del servidor avisa que hay que actualizar el núcleo.

## 7. Lista de revisión antes de publicar

- [ ] `npm test`, `npm run check`, `npm run test:e2e` y `npm run build` pasan.
- [ ] En Vercel: `PUBLIC_MODO_DEMO` no está o vale `false`; las otras 4 variables están cargadas.
- [ ] La portada muestra el nombre y logo reales de la empresa.
- [ ] El catálogo lista solo productos publicados; los agotados dicen "Agotado".
- [ ] Un producto despublicado en el panel desaparece de la web en menos de 1 minuto.
- [ ] Pedido de prueba por WhatsApp desde un celular: llega al número de la tienda con el detalle correcto.
- [ ] `https://{dominio}/sitemap.xml` y `/robots.txt` usan el dominio del cliente.
- [ ] Lighthouse en celular (Chrome DevTools): LCP menor a 2,5 s.
- [ ] Términos y Política de Privacidad de CSPlatform actualizados (tarea del dueño, plan sección 12).

## 8. Pruebas

- **Unitarias (`tests/unit`)**: contrato y límites del backend, modo demo, lista, mensaje de WhatsApp, formato y
  direcciones del catálogo.
- **De punta a punta (`tests/e2e`)**: levantan dos servidores en modo demo (puerto 4322 con la tienda abierta y
  4323 con la tienda desactivada) y prueban en celular y escritorio: búsqueda, filtros, agregar, lista, refresco
  de precios, pedido por WhatsApp (la salida a `wa.me` se intercepta), estado no disponible, SEO, 404 y anchos de
  360 a 430 px.
- En GitHub Actions corren todas en cada push y pull request (`.github/workflows/ci.yml`).

## 9. Traer mejoras del núcleo a una copia

```bash
git remote add plantilla https://github.com/Sp-Cesar/csplatform-store-template.git
git fetch plantilla
git checkout plantilla/main -- src/lib src/pages/sitemap.xml.ts src/pages/robots.txt.ts tests/unit
npm test
```

Revisa el diff antes de hacer commit. Si el backend publica un contrato nuevo (`web_*_v2`), las funciones
anteriores siguen funcionando: cada cliente se actualiza cuando conviene.

## 10. Problemas comunes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| "Esta tienda no está disponible por ahora" | Web desactivada en el Centro de Control, membresía vencida o `slug` mal escrito | Revisa la ficha de la empresa y `PUBLIC_TIENDA_SLUG` |
| "No pudimos cargar el catálogo" | El backend no responde o falta la clave | Revisa `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY`; mira los logs de Vercel |
| Error `PUBLIC_TIENDA_SLUG no es válido` | El `slug` tiene mayúsculas, espacios o menos de 3 caracteres | Usa el `slug` exacto del Centro de Control |
| La web muestra la Tienda Demo en producción | `PUBLIC_MODO_DEMO=true` quedó cargada en Vercel | Bórrala y vuelve a desplegar |
| Un producto no aparece | No está marcado "Publicar en la web", está inactivo o eliminado | Revísalo en el panel |
| No aparece el botón "Pedir por WhatsApp" | La empresa no configuró su WhatsApp | Pedir que lo configure en Configuración del panel |
| Un cambio de precio tarda en verse | Caché de 60 s del CDN | Espera un minuto; la lista siempre trae el precio actual |
| `npm run test:e2e` no arranca: "Another astro dev server is already running" | Otro `astro dev` sin `--ignore-lock` | Las pruebas ya usan `--ignore-lock`; actualiza `playwright.config.ts` desde la plantilla |

## 11. Estado

- Fases 3, 4 y 5 hechas, en modo demo.
- Pendiente: probar contra el backend real cuando existan las funciones `web_*` (fases 1 y 2 del plan, en
  `csplatform-saas`) y medir el LCP con la web desplegada en Vercel.
