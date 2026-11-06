import { defineConfig, devices } from '@playwright/test'

// Pruebas de punta a punta en modo demo: no necesitan backend ni claves.
// Se levantan dos servidores: una tienda abierta y otra que simula una web desactivada.
export const PUERTO_DEMO = 4322
export const PUERTO_CERRADA = 4323

const servidor = (puerto: number, slug: string) => ({
  // --ignore-lock: Astro permite un solo servidor de desarrollo por proyecto; aquí se necesitan dos.
  command: `npx astro dev --port ${puerto} --ignore-lock`,
  // robots.txt responde 200 incluso en la tienda cerrada (su portada da 503 y Playwright esperaría para siempre).
  url: `http://localhost:${puerto}/robots.txt`,
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,
  // Las variables del proceso tienen prioridad sobre .env.
  env: {
    PUBLIC_MODO_DEMO: 'true',
    PUBLIC_TIENDA_SLUG: slug,
    PUBLIC_SITIO_URL: `http://localhost:${puerto}`,
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: '',
    SENTRY_DSN: '',
    PUBLIC_UMAMI_SCRIPT: '',
    PUBLIC_UMAMI_ID: '',
  },
})

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PUERTO_DEMO}`,
    trace: 'retain-on-failure',
    locale: 'es-PE',
  },
  projects: [
    { name: 'celular', use: { ...devices['Pixel 7'] } },
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [servidor(PUERTO_DEMO, 'demo'), servidor(PUERTO_CERRADA, 'no-disponible')],
})
