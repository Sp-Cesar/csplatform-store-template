// Configuración pública de la web: segura para el navegador (no contiene claves).
// Núcleo compartido: no editar por cliente. Las claves del backend viven en conexion.ts, solo en el servidor.

export const sitio = {
  slug: import.meta.env.PUBLIC_TIENDA_SLUG ?? '',
  url: import.meta.env.PUBLIC_SITIO_URL ?? '',
  modoDemo: import.meta.env.PUBLIC_MODO_DEMO === 'true',
  umami: {
    script: import.meta.env.PUBLIC_UMAMI_SCRIPT ?? '',
    id: import.meta.env.PUBLIC_UMAMI_ID ?? '',
  },
}

/** Slug de esta web. En modo demo puede quedar vacío. */
export const slugTienda = sitio.slug || (sitio.modoDemo ? 'demo' : '')
