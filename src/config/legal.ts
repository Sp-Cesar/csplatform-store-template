// Datos legales propios de cada cliente. Este archivo SÍ se edita en cada copia de la plantilla.
// Los textos de src/pages/legal/ son una BASE: deben revisarse con asesoría legal antes de publicar.

export const legal = {
  /** Poner true solo después de que un abogado revise los textos de esta tienda. Mientras sea false,
   *  las páginas legales muestran un aviso en desarrollo y modo demo. */
  revisado: false,
  /** Fecha de la última actualización de los textos (AAAA-MM-DD). */
  actualizado: '2026-11-06',
  /** Días para pedir un cambio o devolución desde la entrega. */
  diasCambio: 7,
  /** Días hábiles para responder un reclamo (confirmar el plazo vigente con asesoría legal). */
  diasRespuestaReclamo: 15,
  /** Medio de contacto para ejercer derechos sobre datos personales; si es null se usa el email de la tienda. */
  contactoDatosPersonales: null as string | null,
}
