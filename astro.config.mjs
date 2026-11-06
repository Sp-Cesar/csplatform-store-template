// @ts-check
import { defineConfig, envField } from 'astro/config'
import preact from '@astrojs/preact'
import vercel from '@astrojs/vercel'
import tailwindcss from '@tailwindcss/vite'
import { loadEnv } from 'vite'

// .env no llega a process.env en este archivo: se lee aparte. En Vercel ya viene en process.env.
const env = { ...loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), ''), ...process.env }
const modoDemo = env.PUBLIC_MODO_DEMO === 'true'

// Protección: una web en producción nunca muestra datos de ejemplo ni arranca sin conexión al backend.
if (env.VERCEL_ENV === 'production') {
  if (modoDemo) throw new Error('PUBLIC_MODO_DEMO=true no se permite en producción. Quita la variable en Vercel.')
  const faltan = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'PUBLIC_TIENDA_SLUG', 'PUBLIC_SITIO_URL'].filter((v) => !env[v])
  if (faltan.length > 0) throw new Error(`Faltan variables de entorno en Vercel: ${faltan.join(', ')}`)
}

// Páginas generadas en el servidor y guardadas en el CDN de Vercel 60 s (ver lib/conexion.ts).
export default defineConfig({
  site: env.PUBLIC_SITIO_URL || undefined,
  output: 'server',
  adapter: vercel(),
  integrations: [preact()],
  vite: {
    plugins: [tailwindcss()],
  },
  // Claves del backend: solo en el servidor y leídas al ejecutar (se pueden rotar sin recompilar).
  env: {
    schema: {
      SUPABASE_URL: envField.string({ context: 'server', access: 'secret', optional: true, url: true }),
      SUPABASE_ANON_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      SENTRY_DSN: envField.string({ context: 'server', access: 'secret', optional: true, url: true }),
    },
  },
})
