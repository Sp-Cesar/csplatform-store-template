// Arma el mensaje del pedido y el enlace wa.me. No se guarda nada en el backend.
// Núcleo compartido: no editar por cliente. Ver plan-vitrina-web.md, sección 7.4.

import { formatearSoles } from './formato'
import { totalLista, type ElementoLista } from './lista'

export interface DatosPedido {
  elementos: ElementoLista[]
  nombre?: string
  entrega?: string
}

/** Deja solo dígitos (con código de país, p. ej. 51987654321). null si no es un número válido. */
export function normalizarWhatsapp(numero: string | null | undefined): string | null {
  const digitos = (numero ?? '').replace(/\D/g, '')
  return /^[0-9]{9,15}$/.test(digitos) ? digitos : null
}

export function mensajePedido({ elementos, nombre, entrega }: DatosPedido): string {
  const lineas = ['Hola, quiero hacer este pedido desde la web:']
  for (const e of elementos) {
    lineas.push(`${e.cantidad} x ${e.nombre} (${e.sku}) - ${formatearSoles(e.precio * e.cantidad)}`)
  }
  lineas.push(`Total referencial: ${formatearSoles(totalLista(elementos))}`)
  if (nombre?.trim()) lineas.push(`Nombre: ${nombre.trim()}`)
  if (entrega?.trim()) lineas.push(`Entrega: ${entrega.trim()}`)
  return lineas.join('\n')
}

export function mensajeConsulta(producto: { nombre: string; sku: string }): string {
  return `Hola, quiero consultar por este producto: ${producto.nombre} (${producto.sku})`
}

/** Enlace que abre WhatsApp con el mensaje. null si la tienda no tiene WhatsApp configurado. */
export function enlaceWhatsapp(numero: string | null | undefined, mensaje: string): string | null {
  const limpio = normalizarWhatsapp(numero)
  return limpio ? `https://wa.me/${limpio}?text=${encodeURIComponent(mensaje)}` : null
}
