// @ts-check
import { defineConfig } from 'astro/config'
import preact from '@astrojs/preact'
import vercel from '@astrojs/vercel'
import tailwindcss from '@tailwindcss/vite'
import { loadEnv } from 'vite'

// .env no llega a process.env en este archivo: se lee aparte. En Vercel ya viene en process.env.
const env = { ...loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), 'PUBLIC_'), ...process.env }

// Páginas generadas en el servidor y guardadas en el CDN de Vercel 60 s (ver lib/conexion.ts).
export default defineConfig({
  site: env.PUBLIC_SITIO_URL || undefined,
  output: 'server',
  adapter: vercel(),
  integrations: [preact()],
  vite: {
    plugins: [tailwindcss()],
  },
})
