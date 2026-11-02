interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL?: string
  readonly PUBLIC_SUPABASE_ANON_KEY?: string
  readonly PUBLIC_TIENDA_SLUG?: string
  readonly PUBLIC_SITIO_URL?: string
  readonly PUBLIC_MODO_DEMO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
