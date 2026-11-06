// Eventos de analítica (Umami: sin cookies, no requiere aviso de cookies). Núcleo compartido: no editar por cliente.
// Si Umami no está configurado o un bloqueador lo impide, no pasa nada.
// NUNCA enviar datos personales (nombre, teléfono, correo, documento): solo SKU, cantidades y montos.

export type EventoAnalitica =
  | { nombre: 'agregar-a-lista'; datos: { sku: string; cantidad: number } }
  | { nombre: 'pedido-whatsapp'; datos: { productos: number; unidades: number; total: number } }
  | { nombre: 'reclamo-registrado'; datos: { tipo: string } }

declare global {
  interface Window {
    umami?: { track: (nombre: string, datos?: Record<string, string | number>) => void }
  }
}

export function registrarEvento({ nombre, datos }: EventoAnalitica) {
  try {
    globalThis.window?.umami?.track(nombre, datos)
  } catch {
    // La analítica nunca debe romper la página.
  }
}
