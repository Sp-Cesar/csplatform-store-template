interface ImportMetaEnv {
  readonly PUBLIC_TIENDA_SLUG?: string
  readonly PUBLIC_SITIO_URL?: string
  readonly PUBLIC_MODO_DEMO?: string
  readonly PUBLIC_UMAMI_SCRIPT?: string
  readonly PUBLIC_UMAMI_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
