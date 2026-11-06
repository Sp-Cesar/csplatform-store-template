# Plantilla de vitrina CSPlatform: guía maestra

> Documento de referencia para personas y para otras IAs. Define los cuatro pilares de la plantilla
> (componentes, seguridad, conexión de datos y guía para IAs), qué ya está hecho, qué reglas son obligatorias
> y qué falta para que la plantilla esté completa.
>
> - Versión del documento: 1.1 (2026-11-06). Incorpora las decisiones de la sección 6.5.
> - Versión del contrato con el backend: **1** (`VERSION_CONTRATO` en `src/lib/tipos.ts`)
> - Guía operativa (instalar, crear un cliente, desplegar): `README.md`
> - Plan del proyecto: `../plan-vitrina-web.md` (carpeta común `constock-project`)

---

## Índice

1. [Qué es y cómo está armada](#1-qué-es-y-cómo-está-armada)
2. [Pilar 1: componentes reutilizables](#2-pilar-1-componentes-reutilizables)
3. [Pilar 2: seguridad de la comunicación](#3-pilar-2-seguridad-de-la-comunicación)
4. [Pilar 3: conexión y datos que se pueden mostrar](#4-pilar-3-conexión-y-datos-que-se-pueden-mostrar)
5. [Pilar 4: guía para otras IAs](#5-pilar-4-guía-para-otras-ias)
6. [Lo que falta para que la plantilla esté completa](#6-lo-que-falta-para-que-la-plantilla-esté-completa)
7. [Hoja de ruta sugerida](#7-hoja-de-ruta-sugerida)

---

## 1. Qué es y cómo está armada

Una web de catálogo de **solo lectura** conectada al SaaS CSPlatform. Muestra los productos que la empresa
publica desde su panel, con precio y "Disponible" / "Agotado", y el comprador envía su lista por WhatsApp.
No hay pagos, cuentas de comprador ni pedidos guardados. **El stock y las ventas se gestionan en el panel.**
**Única escritura:** registrar reclamos del Libro de Reclamaciones, exigido por ley.

```
Navegador del comprador  (nunca ve la clave del backend)
   │  HTML ya armado (SSR) + islas Preact pequeñas (~17 KB gzip)
   │  Islas → POST /api/disponibilidad, /api/reclamos  (mismo dominio, límite por visitante)
   ▼
Web del cliente (Astro 7 en Vercel, un repositorio por cliente)
   │  src/lib/conexion.ts (solo servidor) → POST /rest/v1/rpc/web_*  (clave anon privada)
   ▼
Backend CSPlatform (Supabase / PostgreSQL)
   ├─ Funciones web_*  → única puerta para la web (SECURITY DEFINER, columnas explícitas)
   └─ Tablas internas  → RLS, sin ningún permiso para anon
```

| Capa | Dónde | ¿Se edita por cliente? |
|---|---|---|
| Núcleo: contrato, conexión, lista, WhatsApp, SEO técnico | `src/lib/`, `src/pages/sitemap.xml.ts`, `src/pages/robots.txt.ts` | **No.** Se mejora en la plantilla y se sincroniza |
| Endpoints propios | `src/pages/api/` | **No** (núcleo) |
| Marca: textos y colores | `src/config/tienda.ts`, `src/styles/global.css` | Sí |
| Datos legales (plazos, revisado) | `src/config/legal.ts` | Sí |
| Diseño: layout, componentes, islas, páginas | `src/layouts/`, `src/components/`, `src/pages/` | Sí, respetando las reglas de este documento |
| Pruebas | `tests/unit/` (núcleo), `tests/e2e/` (recorrido) | Las e2e se ajustan si cambian textos |

---

## 2. Pilar 1: componentes reutilizables

### 2.1 Inventario actual

**Componentes de servidor (Astro, sin JavaScript en el navegador)**

| Componente | Archivo | Props | Para qué |
|---|---|---|---|
| `Tienda` (layout) | `src/layouts/Tienda.astro` | `estado`, `titulo?`, `descripcion?`, `imagen?`, `datosEstructurados?`, `noIndexar?`, `busqueda?` | Cabecera con buscador y contador, pie con contacto, SEO (title, OG, canonical, JSON-LD), estado "no disponible" |
| `TarjetaProducto` | `src/components/TarjetaProducto.astro` | `producto: ProductoResumen`, `prioridad?` | Tarjeta clicable con imagen, marca, nombre, SKU, precio, disponibilidad y botón Agregar |
| `GrillaProductos` | `src/components/GrillaProductos.astro` | `productos: ProductoResumen[]` | Grilla responsive 2/3/4 columnas; da prioridad de carga a las 4 primeras imágenes |
| `ImagenProducto` | `src/components/ImagenProducto.astro` | `src`, `alt`, `prioridad?`, `tamano?` | Imagen cuadrada con marcador "Sin imagen" |
| `Paginacion` | `src/components/Paginacion.astro` | `filtros: FiltrosCatalogo`, `paginas` | Enlaces numerados con "…", funciona sin JavaScript |
| `AvisoError` | `src/components/AvisoError.astro` | — | Aviso cuando el backend falla |
| `PaginaLegal` | `src/components/PaginaLegal.astro` | `titulo` | Contenedor de textos legales con fecha y aviso de "texto base" en desarrollo |

**Islas interactivas (Preact)**

| Isla | Archivo | Props | Hidratación recomendada |
|---|---|---|---|
| `ContadorLista` | `src/components/islas/ContadorLista.tsx` | — | `client:idle` |
| `BotonAgregar` | `src/components/islas/BotonAgregar.tsx` | `sku`, `nombre`, `precio`, `disponible`, `compacto?` | `client:visible` en tarjetas, `client:load` en el detalle |
| `Lista` | `src/components/islas/Lista.tsx` | `whatsapp`, `telefono`, `email`, `opcionesEntrega` | `client:load` |
| `FormularioReclamo` | `src/components/islas/FormularioReclamo.tsx` | `email`, `telefono` | `client:load` |

**Páginas**: `/` portada, `/productos` catálogo, `/productos/[sku]` detalle, `/lista`,
`/libro-de-reclamaciones`, `/legal/terminos`, `/legal/privacidad`, `/legal/cambios-y-devoluciones`, `/404`,
`/sitemap.xml`, `/robots.txt`. **Endpoints**: `/api/disponibilidad`, `/api/reclamos`.

### 2.2 Reglas de modularidad (obligatorias)

1. **Un componente, una responsabilidad.** Los datos llegan por props tipadas con los tipos de `src/lib/tipos.ts`;
   un componente visual no llama al backend.
2. **Solo las páginas llaman al backend**, siempre con el patrón de la sección 4.6.
3. **Islas solo donde hay interacción.** Todo lo demás es Astro de servidor (cero JavaScript).
4. **Los botones y campos que dependen de JavaScript nacen desactivados** hasta que la isla carga (`cargada` de
   `usarLista()`, o un estado `listo` con `useEffect`). Si no, un toque temprano se pierde y lo escrito antes de
   la carga se borra.
5. **Estado compartido solo con `usarLista()`.** No crear otro almacenamiento para la lista.
6. **Colores y tipografía solo desde los tokens** de `src/styles/global.css` (`bg-marca`, `text-suave`,
   `border-borde`, `text-agotado`…). No escribir colores sueltos en los componentes.
7. **Accesibilidad mínima:** `alt` en imágenes, `label` en campos, foco visible, `aria-live` en avisos dinámicos,
   sin scroll horizontal a 360, 390 y 430 px.

### 2.3 Componentes que faltan para un ecommerce completo

Ver la tabla completa en la [sección 6](#6-lo-que-falta-para-que-la-plantilla-esté-completa). Resumen:

| Falta | Por qué importa |
|---|---|
| **Menú móvil** | Hoy en celular la navegación "Inicio / Productos" está oculta (`hidden sm:flex`); solo queda el buscador |
| **Primitivas de UI** (`Boton`, `Precio`, `EstadoStock`, `Insignia`, `Campo`) | Hoy las clases se repiten en cada componente; cambiar el estilo de botón obliga a tocar 6 archivos |
| **Botón flotante de WhatsApp** | Canal principal de venta; debe estar a un toque desde cualquier página |
| **Páginas institucionales** (Nosotros, Contacto) | Confianza del comprador. Las legales y el Libro de Reclamaciones ya existen |
| **Estados de carga (skeleton) y notificaciones (toast)** | Hoy el feedback es solo texto; en red lenta la lista muestra "Cargando…" |
| **Galería de imágenes, productos relacionados, destacados, filtro por precio** | Requieren campos nuevos en el backend (ver 4.8) |
| **Página de muestra de componentes** (`/_componentes`, solo en modo demo) | Para diseñar y revisar todos los componentes en un solo lugar |

---

## 3. Pilar 2: seguridad de la comunicación

### 3.1 Modelo de amenazas

| Activo | Amenaza | Control |
|---|---|---|
| Datos privados de la empresa (costo, stock exacto, sedes, clientes, ventas) | Filtración por la web | La web solo llama funciones `web_*` que devuelven columnas explícitas; `anon` no tiene permisos sobre tablas |
| Integridad del inventario | Escritura desde la web | No existe ninguna función de escritura para `anon`; el stock solo cambia en el panel (Kardex) |
| Datos de otras empresas | Acceso cruzado | Cada función recibe `p_slug` y filtra por la empresa de esa web; `_tienda_visible` resuelve el slug en el servidor |
| Catálogo completo | Copia masiva (scraping) | Máx. 48 productos y 50 SKU por llamada; solo productos publicados; límite por visitante en `/api/*` |
| Clave del backend | Robo para usarla desde otro lado | La clave vive solo en el servidor (`astro:env/server`); el navegador habla con `/api/*` |
| Endpoints propios | Uso desde otros sitios, spam, bots | Verificación de origen, límite por IP, tamaño máximo del cuerpo, campo trampa y validación en el servidor |
| Visitantes | XSS por datos que escribe la empresa (nombres, descripciones, URLs de imagen) | Astro escapa todo el texto; el JSON-LD se escapa con `jsonParaScript` |
| Comprador | Recolección de datos personales | La lista y el pedido no se guardan. Solo el Libro de Reclamaciones envía datos personales, al backend y por HTTPS, nunca a la analítica ni a la URL |
| Disponibilidad | Empresa morosa sigue vendiendo | `_tienda_visible` revisa la membresía en cada llamada; la web responde 503 |

### 3.2 Controles que ya existen

1. **Solo lectura por diseño.** `src/lib/backend.ts` expone `tienda`, `filtros`, `productos`, `producto` y
   `disponibilidad`, más una sola escritura legal: `registrarReclamo`.
2. **Clave `anon` privada y con permisos mínimos.** Vive en `SUPABASE_ANON_KEY` (solo servidor, leída al ejecutar:
   se puede rotar sin recompilar). Su único poder es ejecutar las funciones `web_*`. En el backend, una prueba con
   lista blanca debe verificarlo (fase 1 del plan). Una prueba e2e confirma que no aparece en el HTML ni en el JS.
3. **Endpoints propios endurecidos** (`src/lib/api.ts`): mismo origen obligatorio, límite por IP
   (`/api/disponibilidad` 30/min, `/api/reclamos` 5/hora), cuerpo máximo, respuestas `no-store`. Astro además
   bloquea formularios enviados desde otros sitios.
4. **Protección del despliegue** (`astro.config.mjs`): en producción la compilación falla si `PUBLIC_MODO_DEMO=true`
   o si falta una variable obligatoria.
5. **Monitoreo de errores** (`src/lib/monitoreo.ts`): todo error del servidor va a los logs y, con `SENTRY_DSN`,
   a Sentry, sin datos personales.
6. **Límites aplicados en ambos lados.** `normalizarParametros` y `normalizarSkus` recortan antes de llamar; el
   backend vuelve a recortar.
7. **Validación de configuración.** `crearBackendSupabase` rechaza URL o clave vacías y un `slug` que no cumpla
   la regla del backend.
8. **Tiempo máximo de 8 s por llamada** (`AbortSignal.timeout`), para no colgar el servidor.
9. **Errores sin filtrar detalles al visitante:** el detalle va a los logs y a Sentry; el visitante ve un aviso
   genérico y la respuesta no se cachea.
10. **Escapado de salida:** Astro escapa el HTML; el JSON-LD usa `jsonParaScript` (escapa `<`, `>`, `&`, U+2028, U+2029).
11. **Datos personales mínimos.** La lista guarda solo SKU, nombre, precio y cantidad. El reclamo se valida en el
    navegador y otra vez en el servidor (`src/lib/reclamo.ts`), que descarta campos desconocidos.
12. **Analítica sin cookies y sin datos personales** (`src/lib/analitica.ts`): solo SKU, cantidades y montos.
13. **`.env` fuera del repositorio** (`.gitignore`); las variables se cargan en Vercel.

### 3.3 Reglas obligatorias para cualquier cambio

1. **Nunca** agregar otra llamada que escriba en el backend (la única es `registrarReclamo`) ni pedir otra clave
   que no sea `anon`. La `service_role` **jamás** se usa en una web de cliente.
2. **Nunca** importar `src/lib/conexion.ts` desde una isla ni usar variables `PUBLIC_` para claves. Las islas usan
   `src/lib/clienteApi.ts`; un endpoint nuevo en `src/pages/api/` debe usar `mismoOrigen`, `limitePorVisitante`
   y `leerJson` de `src/lib/api.ts`.
3. **Nunca** mostrar ni calcular cantidades de stock, costos, sedes ni datos de clientes.
4. **Nunca** insertar HTML sin escapar (`set:html`, `dangerouslySetInnerHTML`) con datos del backend.
   Para JSON dentro de `<script>`, usar `jsonParaScript`.
5. **Nunca** poner datos personales en la URL, en `localStorage`, en los logs ni en la analítica.
6. **Nunca** escribir claves o tokens en el código ni en los commits.
7. Toda dependencia nueva debe justificarse y pasar `npm audit` sin vulnerabilidades altas en tiempo de ejecución.

### 3.4 Lo que falta en seguridad

| # | Falta | Riesgo hoy | Propuesta |
|---|---|---|---|
| S1 | **Cabeceras de seguridad** | No se envía CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors` ni HSTS | `src/middleware.ts` en el núcleo que las agrega a toda respuesta; CSP con `connect-src` limitado al dominio de Supabase y `img-src` a los dominios de imágenes |
| S2 | **Validar URLs de imagen** | `imagen_url` es texto libre del panel: puede apuntar a cualquier dominio o esquema | Aceptar solo `https:` (y opcionalmente una lista de dominios); si no cumple, mostrar el marcador |
| S3 | ~~Ocultar la clave `anon` del navegador~~ | **Hecho** (2026-11-06): `/api/disponibilidad`, variables `SUPABASE_*` solo servidor | — |
| S4 | **Límite por visitante a nivel de red** | Hecho en memoria por instancia; en Vercel varias instancias no comparten memoria. Las páginas del catálogo (cacheadas) no tienen límite | Regla de firewall de Vercel para `/api/*` (unos 60 por minuto por IP) en cada proyecto |
| S5 | **Validar las respuestas en tiempo de ejecución** | Si el backend cambia la forma de un dato, la web falla de forma impredecible | Validador ligero en `backend.ts` que descarta campos desconocidos y rechaza tipos incorrectos |
| S6 | **Auditoría de dependencias en CI** | Nadie se entera de vulnerabilidades nuevas | `npm audit --omit=dev --audit-level=high` en CI y Dependabot semanal |
| S7 | ~~Monitoreo de errores~~ | **Hecho**: `SENTRY_DSN` opcional, sin dependencias | Falta crear la cuenta y cargar el DSN (dueño) |
| S8 | ~~Proteger el modo demo en producción~~ | **Hecho**: la compilación falla en producción con modo demo o sin variables | — |

---

## 4. Pilar 3: conexión y datos que se pueden mostrar

### 4.1 Cómo se conecta

Hay dos tramos y la clave solo existe en el segundo:

| Tramo | Quién llama | Cómo |
|---|---|---|
| Navegador → web | Islas, con `src/lib/clienteApi.ts` | `POST /api/disponibilidad`, `POST /api/reclamos` (mismo dominio, JSON) |
| Web (servidor) → backend | Páginas y endpoints, con `backend()` de `src/lib/conexion.ts` | RPC a Supabase con la clave privada |

Tramo web → backend:
- **Transporte:** HTTPS a PostgREST de Supabase, `POST {SUPABASE_URL}/rest/v1/rpc/{funcion}`.
- **Cabeceras:** `apikey: {anon}`, `Authorization: Bearer {anon}`, `Content-Type: application/json`.
- **Cuerpo:** JSON con `p_slug` (lo agrega el cliente) y los parámetros de la función.
- **Respuesta:** el JSON que devuelve la función (`jsonb`). `null` significa "no existe o no visible".
- **Cliente oficial:** `crearBackendSupabase()` en `src/lib/backend.ts`. **No usar `fetch` directo a Supabase**:
  siempre `backend()` de `src/lib/conexion.ts` (solo servidor), que elige el backend real o el demo.

Endpoints propios (navegador → web):

| Endpoint | Cuerpo | Respuestas |
|---|---|---|
| `POST /api/disponibilidad` | `{ "skus": string[] }` (máx. 50) | 200 `Disponibilidad[]` · 400 datos inválidos · 403 otro origen · 429 límite · 502 backend caído |
| `POST /api/reclamos` | `Reclamo` (sección 4.3) | 201 `{ codigo, fecha }` · 422 `{ errores: { "campo": "mensaje" } }` · 400 · 403 · 429 · 503 |

```ts
// Ejemplo sin la plantilla (por ejemplo, para probar desde otra herramienta)
const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/web_productos`, {
  method: 'POST',
  headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_slug: 'mi-tienda', p_busqueda: 'mouse', p_limite: 24, p_desde: 0 }),
})
const datos = await res.json() // { total, filas: [...] }
```

### 4.2 Contrato v1: funciones

| Función | Parámetros (además de `p_slug`) | Respuesta |
|---|---|---|
| `web_tienda` | — | `Tienda` o `null` |
| `web_filtros` | — | `{ categorias: OpcionFiltro[], marcas: OpcionFiltro[] }` |
| `web_productos` | `p_busqueda text`, `p_categoria uuid`, `p_marca uuid`, `p_orden text` (`nombre`, `precio_asc`, `precio_desc`, `recientes`), `p_limite int` (1–48), `p_desde int` (≥ 0) | `{ total, filas: ProductoResumen[] }` |
| `web_producto` | `p_sku text` | `ProductoDetalle` o `null` |
| `web_disponibilidad` | `p_skus text[]` (máx. 50) | `Disponibilidad[]` |
| `web_registrar_reclamo` (**pendiente en el backend**) | `p_reclamo jsonb` (`Reclamo`) | `{ codigo, fecha }` |

Reglas del backend:
- **Producto visible** = marcado "Publicar en la web", activo, no eliminado y de la empresa de esa web.
- **`disponible`** = suma de stock en sedes no eliminadas > 0. **La cantidad nunca se devuelve.**
- **Búsqueda literal** por nombre o SKU (sin comodines). El identificador público del producto es el **SKU**.
- Ninguna función lanza error por un `slug` inexistente: devuelve `null` o vacío.

### 4.3 Contrato v1: formas de los datos (`src/lib/tipos.ts`)

```jsonc
// Tienda (web_tienda)
{ "version_contrato": 1, "slug": "mi-tienda", "nombre": "Tienda Demo", "logo_url": "https://…" | null,
  "whatsapp": "51999999999" | null, "telefono": "01 555 0000" | null, "direccion": "…" | null,
  "email": "ventas@…" | null, "sitio_web": "https://…" | null,
  "razon_social": "Tienda Demo S.A.C." | null, "ruc": "20000000001" | null }   // nuevos, opcionales

// Reclamo (POST /api/reclamos y web_registrar_reclamo). Ver src/lib/reclamo.ts
{ "tipo": "reclamo" | "queja",
  "consumidor": { "nombres": "…", "tipo_documento": "DNI" | "CE" | "PASAPORTE" | "RUC", "numero_documento": "…",
                  "domicilio": "…", "telefono": "…", "email": "…", "menor_de_edad": false, "apoderado": null },
  "bien": { "tipo": "producto" | "servicio", "descripcion": "…", "monto": 120.5 | null },
  "detalle": "…", "pedido": "…", "declaracion": true }

// OpcionFiltro (web_filtros)
{ "id": "uuid", "nombre": "Laptops", "total": 3 }

// ProductoResumen (filas de web_productos)
{ "sku": "LAP-001", "nombre": "Laptop…", "precio": 2500, "imagen_url": "https://…" | null,
  "categoria": "Laptops" | null, "marca": "Lenovo" | null, "disponible": true }

// ProductoDetalle (web_producto)
{ …ProductoResumen, "descripcion": "…" | null,
  "especificaciones": { "Memoria": "8 GB" } | [{ "nombre": "Memoria", "valor": "8 GB" }] | null }

// Disponibilidad (web_disponibilidad)
{ "sku": "LAP-001", "nombre": "Laptop…", "precio": 2500, "disponible": true }
```

### 4.4 Qué se puede mostrar y qué nunca

| Se puede mostrar | Nunca (no existe en el contrato y no debe inventarse) |
|---|---|
| Nombre, logo, WhatsApp, teléfono, dirección, email y sitio de la tienda | Id de empresa, estado de membresía, plan |
| Razón social y RUC (los exige el Libro de Reclamaciones) | Estado de membresía, plan, id interno |
| SKU, nombre, descripción, precio de venta, imagen, especificaciones, categoría, marca | Costo, margen, proveedor |
| "Disponible" / "Agotado" | Cantidad de stock, stock por sede, sedes |
| Totales "referenciales" de la lista del comprador | Ventas, clientes, pedidos, Kardex |

### 4.5 Dónde corre cada llamada

| Llamada | Dónde | Caché |
|---|---|---|
| `tienda`, `filtros`, `productos`, `producto` | Servidor (páginas Astro) | CDN de Vercel 60 s (`s-maxage=60, stale-while-revalidate=300`) |
| `disponibilidad` | Servidor, pedido por la isla `Lista` vía `/api/disponibilidad` al abrir la lista y antes de enviar | Sin caché: siempre fresco |
| `registrarReclamo` | Servidor, vía `/api/reclamos` | Sin caché |
| Sitemap | Servidor | 1 hora |

Si la tienda no está disponible: 503 y `no-store`. Si una llamada falla: aviso y `no-store`.
Si el SKU no existe: 404 y `no-store`.

### 4.6 Patrón obligatorio en una página

```astro
---
import Tienda from '../layouts/Tienda.astro'
import AvisoError from '../components/AvisoError.astro'
import { backend, cargarTienda } from '../lib/conexion'
import { aplicarCache, intentar } from '../lib/pagina'

const estado = await cargarTienda()          // 1. ¿La web está disponible?
aplicarCache(Astro.response, estado)         // 2. Caché o 503
const r = await intentar(                    // 3. Llamada segura con respaldo
  Astro.response,
  () => (estado.estado === 'ok' ? backend().productos({ orden: 'recientes', limite: 8 }) : Promise.resolve({ total: 0, filas: [] })),
  { total: 0, filas: [] },
)
---

<Tienda estado={estado} titulo="Novedades">
  {r.ok ? /* usar r.valor */ null : <AvisoError />}
</Tienda>
```

### 4.7 Versionado del contrato

- Cada respuesta de `web_tienda` trae `version_contrato`. La plantilla entiende la **1**.
- Un cambio compatible (campo nuevo opcional) no cambia la versión.
- Un cambio incompatible crea funciones nuevas (`web_productos_v2`) y las anteriores siguen funcionando, porque
  cada cliente se actualiza por separado.
- Si el backend informa una versión mayor, `cargarTienda()` deja un aviso en los logs del servidor.

### 4.8 Lo que falta en la conexión

| # | Falta | Dónde se resuelve |
|---|---|---|
| C1 | **Prueba de humo contra el backend real** (`npm run verificar:backend`): llama a las 5 funciones con un `slug` de prueba, valida las formas y comprueba que no aparezcan campos privados | Plantilla (cuando exista la fase 1) |
| C2 | **Contrato en formato máquina** (JSON Schema) generado desde `tipos.ts`, para que otras herramientas e IAs lo validen | Plantilla |
| C3 | **Reintento con espera** ante errores de red o 5xx (1 reintento, solo lecturas) | Plantilla |
| C4 | **Imágenes optimizadas** (tamaños y formatos modernos con el servicio de imágenes de Vercel) | Plantilla |
| C5 | **Campos nuevos en el contrato v2:** slug de categoría y marca (URLs legibles en vez de UUID), `categoria_id` en el detalle (relacionados), varias imágenes, destacados, precio "antes" (ofertas) | Backend (`csplatform-saas`) |
| C6 | **Revalidación al cambiar algo en el panel** (purgar la caché del CDN al publicar o cambiar precio) | Backend + plantilla, mejora posterior |

### 4.9 Pedido al backend para el Libro de Reclamaciones

La plantilla ya envía los reclamos; el backend (`csplatform-saas`) debe implementar lo siguiente. Mientras no
exista, `/api/reclamos` responde 503 `reclamos-no-habilitados` y el formulario muestra el correo y teléfono de la
tienda como alternativa.

1. **`web_tienda` agrega `razon_social` y `ruc`** (desde `empresas`). Cambio compatible: no sube la versión.
2. **Tabla `reclamos`** con RLS por tenant: `id`, `empresa_id`, `codigo` (único por empresa), `tipo`, datos del
   consumidor, `bien_tipo`, `bien_descripcion`, `monto`, `detalle`, `pedido`, `estado` (`pendiente`, `respondido`),
   `respuesta`, `respondido_en`, `creado`. Sin permisos para `anon`.
3. **Función `web_registrar_reclamo(p_slug text, p_reclamo jsonb) returns jsonb`**: `SECURITY DEFINER`,
   `search_path` fijo, usa `_tienda_visible`; vuelve a validar campos y largos (mismas reglas que
   `src/lib/reclamo.ts`); genera el correlativo de forma atómica (`R-AAAA-NNNNNN` por empresa); máximo de reclamos
   por empresa por hora; devuelve `{ codigo, fecha }`. `grant execute ... to anon` y agregarla a la lista blanca
   de la prueba de permisos.
4. **Copia al consumidor por correo** con el código, la fecha y el detalle (obligatorio). Por ejemplo, una Edge
   Function disparada al insertar.
5. **Panel:** bandeja "Libro de Reclamaciones" con días restantes para responder (plazo en
   `src/config/legal.ts`, 15 días hábiles por defecto), respuesta y aviso al administrador cuando entra uno nuevo.

---

## 5. Pilar 4: guía para otras IAs

Si eres una IA trabajando en este repositorio o en una copia de cliente, lee esto completo antes de tocar código.
El resumen operativo está en `AGENTS.md`.

### 5.1 Reglas de oro

1. **Idioma:** código, comentarios, nombres y textos en **español**.
2. **No edites `src/lib/`** en una copia de cliente. Los cambios al núcleo se hacen en la plantilla.
3. **Solo lectura:** la web no escribe en el backend, salvo `registrarReclamo` (legal). No agregues otras
   escrituras, tablas ni claves. La clave vive solo en el servidor: las islas usan `/api/*`.
4. **No inventes datos:** usa solo los campos del contrato (sección 4.3). Si falta un dato, documéntalo como
   pedido al backend (sección 4.8, C5); no lo simules en producción.
5. **Seguridad:** cumple la sección 3.3 sin excepciones.
6. **Credenciales:** nunca escribas, inventes ni imprimas claves. Para desarrollar usa el modo demo.
7. **Antes de terminar**, corre la verificación de la sección 5.4.

### 5.2 Cómo conectarse al sistema

- **Desde la plantilla, en el servidor** (páginas `.astro` y `src/pages/api/`): `import { backend } from '../lib/conexion'`
  y llama `backend().productos(...)`, etc. Los tipos están en `src/lib/tipos.ts`.
- **Desde una isla (navegador):** `consultarDisponibilidad()` o `enviarReclamo()` de `src/lib/clienteApi.ts`.
  Si necesitas otro dato en el navegador, crea un endpoint en `src/pages/api/` (sección 3.3, regla 2).
- **Sin backend (desarrollo):** `PUBLIC_MODO_DEMO=true` en `.env`. El modo demo (`src/lib/demo.ts`) implementa la
  misma interfaz con 13 productos de ejemplo. El slug `no-disponible` simula una web desactivada.
- **Con el backend real:** `PUBLIC_MODO_DEMO=false`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` (solo servidor) y
  `PUBLIC_TIENDA_SLUG`. Los valores los entrega el dueño; no los busques ni los pidas a otra fuente.
- **Desde fuera de la plantilla:** sección 4.1 (petición HTTP) y 4.2–4.3 (contrato).

### 5.3 Recetas

**Agregar una página:** crea `src/pages/{ruta}.astro` con el patrón de la sección 4.6. Si no debe indexarse,
pasa `noIndexar` al layout. Agrega una prueba en `tests/e2e/`.

**Agregar un componente visual:** crea `src/components/{Nombre}.astro`, recibe datos por props con tipos de
`src/lib/tipos.ts`, usa los tokens de color y no llames al backend dentro del componente.

**Agregar interacción:** crea una isla en `src/components/islas/{Nombre}.tsx` (Preact). Para la lista usa
`usarLista()` y las funciones puras de `src/lib/lista.ts`. Desactiva botones y campos hasta que la isla cargue.
Nunca importes `src/lib/conexion.ts` en una isla.

**Medir una acción:** `registrarEvento({ nombre, datos })` de `src/lib/analitica.ts` (agrega el evento al tipo
`EventoAnalitica`). En un enlace basta `data-umami-event="nombre"`. Nunca datos personales.

**Agregar un endpoint:** `src/pages/api/{nombre}.ts` con `mismoOrigen`, `limitePorVisitante`, `leerJson` y
`respuestaJson` de `src/lib/api.ts`; errores con `reportarError` de `src/lib/conexion.ts`; prueba en `tests/e2e/`.

**Mostrar un precio:** `formatearSoles(precio)` de `src/lib/formato.ts`. **Enlazar un producto:**
`rutaProducto(sku)` de `src/lib/catalogo.ts`. **Armar un enlace de WhatsApp:** `enlaceWhatsapp(numero, mensaje)`.

**Cambiar el núcleo (solo en la plantilla):** cambia `src/lib/`, agrega o ajusta `tests/unit/`, actualiza este
documento y el README si cambia el uso, y anota el cambio para que las copias lo sincronicen.

### 5.4 Verificación antes de entregar

```bash
npm test          # unitarias del núcleo
npm run check     # tipos de TypeScript y Astro
npm run test:e2e  # recorrido completo en modo demo (celular y escritorio)
npm run build     # compilación para Vercel
```

Las cuatro deben pasar. Si cambiaste algo visible, revísalo también a 360 px de ancho.

### 5.5 Qué no hacer

- No uses `supabase-js` ni otra librería de datos: `fetch` dentro de `backend.ts` es suficiente.
- No llames `fetch` a Supabase desde componentes, islas o páginas: usa `backend()` en el servidor.
- No agregues dependencias pesadas al navegador (el presupuesto de JavaScript es ~20 KB gzip).
- No cambies los textos que buscan las pruebas e2e sin actualizar las pruebas.
- No hagas commit ni push salvo que el dueño lo pida.

---

## 6. Lo que falta para que la plantilla esté completa

Prioridad: **P0** antes del primer cliente en producción · **P1** para que sea una base ecommerce sólida ·
**P2** mejoras posteriores. "Dónde": **Plantilla** (este repo), **Backend** (`csplatform-saas`), **Dueño**
(decisión o trámite).

### 6.1 Bloqueantes (P0)

| # | Qué | Dónde | Tiempo estimado |
|---|---|---|---|
| 1 | Funciones `web_*` en el backend (fases 1 y 2 del plan) | Backend | 2 días |
| 1b | Libro de Reclamaciones en el backend: `razon_social` y `ruc` en `web_tienda`, tabla, `web_registrar_reclamo`, correo al consumidor y bandeja en el panel (sección 4.9) | Backend | 2 a 3 días |
| 2 | Prueba de humo contra el backend real (C1) | Plantilla | 2 horas |
| 3 | Cabeceras de seguridad con middleware (S1) | Plantilla | 3 horas |
| 4 | Validar URLs de imagen (S2). ~~Bloquear modo demo en producción (S8)~~ hecho | Plantilla | 1 hora |
| 5 | Menú de navegación en celular | Plantilla | 2 horas |
| 6 | ~~Páginas legales y Libro de Reclamaciones~~ estructura y textos base **hechos**. Falta: revisión de un abogado, completar `src/config/legal.ts` y marcar `revisado: true` | Dueño | Revisión legal |
| 6b | Regla de firewall de Vercel para `/api/*` en cada proyecto (S4) | Dueño, al crear el proyecto | 10 minutos |

### 6.2 Base ecommerce sólida (P1)

| # | Qué | Dónde | Tiempo estimado |
|---|---|---|---|
| 7 | Primitivas de UI (`Boton`, `Precio`, `EstadoStock`, `Insignia`, `Campo`) y refactor de componentes | Plantilla | 1 día |
| 8 | Página de muestra de componentes `/_componentes` (solo demo) | Plantilla | 3 horas |
| 9 | Botón flotante de WhatsApp, páginas Nosotros y Contacto | Plantilla | 4 horas |
| 10 | ~~Endpoint `/api/disponibilidad` para no exponer la clave y limitar peticiones (S3, S4)~~ **hecho** | — | — |
| 11 | Validación de respuestas en tiempo de ejecución (S5) y reintento (C3) | Plantilla | 3 horas |
| 12 | ~~Analítica: visitas y eventos~~ **hecho** con Umami (sin cookies): `agregar-a-lista`, `pedido-whatsapp`, `consulta-whatsapp`, `reclamo-registrado`. Falta crear la cuenta y cargar `PUBLIC_UMAMI_*` | Dueño | 15 minutos |
| 13 | Auditoría de dependencias en CI y Dependabot (S6); pruebas de accesibilidad con axe | Plantilla | 2 horas |
| 14 | Lighthouse en CI con presupuesto (LCP < 2,5 s en celular) | Plantilla | 3 horas |
| 15 | Imágenes optimizadas (C4) | Plantilla | 3 horas |
| 16 | Tema por cliente en un solo lugar: tokens, fuentes, favicon, imagen OG por defecto, `manifest` | Plantilla | 3 horas |
| 17 | Página de error 500 propia y aviso si el backend tarda | Plantilla | 2 horas |

### 6.3 Plantilla mantenible (P1)

| # | Qué | Dónde | Tiempo estimado |
|---|---|---|---|
| 18 | Versionado de la plantilla: `CHANGELOG.md`, etiquetas semver y script `npm run sincronizar-nucleo` | Plantilla | 3 horas |
| 19 | ~~Validación de variables de entorno al compilar~~ **hecho** en producción (`astro.config.mjs` + `astro:env`) | — | — |
| 20 | Contrato en JSON Schema (C2) | Plantilla | 2 horas |
| 21 | ~~Monitoreo de errores (S7)~~ **hecho** (Sentry opcional). Falta crear la cuenta y cargar `SENTRY_DSN` | Dueño | 15 minutos |

### 6.4 Mejoras posteriores (P2, casi todas necesitan el contrato v2)

| # | Qué | Dónde |
|---|---|---|
| 22 | URLs legibles de categoría y marca (`/categoria/laptops`) | Backend + Plantilla |
| 23 | Galería con varias fotos, productos relacionados, destacados en portada, precio de oferta | Backend + Plantilla |
| 24 | Filtro por rango de precio y disponibilidad | Backend + Plantilla |
| 25 | Purga de caché al cambiar algo en el panel (C6) | Backend + Plantilla |
| 26 | Modo oscuro opcional y varios idiomas o monedas | Plantilla |
| 27 | Pagos en línea, registro de pedidos y caja virtual (fuera de V1 por decisión del dueño) | Backend + Plantilla + Dueño |

### 6.5 Decisiones tomadas (2026-11-06)

| # | Decisión | Resultado |
|---|---|---|
| D1 | Clave del backend | **Solo en el servidor.** El navegador usa `/api/*`; variables `SUPABASE_URL` y `SUPABASE_ANON_KEY` sin `PUBLIC_` |
| D2 | Analítica y errores | **Umami** (sin cookies, sin aviso de cookies) y **Sentry** plan gratis, ambos opcionales por variable de entorno |
| D3 | Libro de Reclamaciones | **Lo registra CSPlatform** (`web_registrar_reclamo`, única escritura de la web). Responde **cada tienda** desde su panel. CSPlatform da textos legales base revisados por un abogado y cada tienda completa sus datos |
| D4 | Contrato v2 | **Después del primer cliente**, en este orden: varias fotos, URLs legibles, ofertas |

Pendiente del dueño: revisión legal de los textos base, cuentas de Umami y Sentry, y la regla de firewall de Vercel.

---

## 7. Hoja de ruta sugerida

| Paso | Contenido | Resultado |
|---|---|---|
| ~~0~~ | ~~Decisiones D1–D3: clave en servidor, analítica, monitoreo, Libro de Reclamaciones y páginas legales~~ | **Hecho** |
| 1 | Seguridad base: S1 (cabeceras), S2 (URLs de imagen) | Plantilla segura para producción |
| 2 | Navegación móvil, primitivas de UI, `/_componentes`, botón flotante, Nosotros, Contacto | Kit de componentes completo |
| 3 | Backend: fases 1 y 2 del plan y Libro de Reclamaciones (4.9); prueba de humo C1 | Conexión real verificada |
| 4 | Validación de respuestas, reintento, Lighthouse y auditoría de dependencias en CI | Base ecommerce sólida |
| 5 | Versionado y sincronización del núcleo; revisión legal | Lista para el primer cliente |
| 6 | Contrato v2 (D4) y mejoras P2 | Catálogo más rico |

Al terminar cada paso: actualizar este documento (secciones 2.3, 3.4, 4.8 y 6), el README y la sección 12 del plan.
