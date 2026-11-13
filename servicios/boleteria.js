import { randomBytes } from "node:crypto";
import mongoose from "mongoose";

import Entrada from "../models/Entrada.js";
import Funcion, { VENTANA_INGRESO_DEFECTO } from "../models/Funcion.js";

export const MAX_POR_COMPRA = 6;

// Constantes de tiempo. La ventana de ingreso ya no está acá: se define en cada función.
const MINUTO_MS = 60 * 1000;
const HORA_MS = 60 * MINUTO_MS;
const HORAS_VENTA_PUERTA_DESPUES = 1; // en boletería se vende hasta 1 h después del inicio

// Error de negocio con el código HTTP que corresponde (400, 404, 409...).
export class ErrorBoleteria extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

// Vende entradas de una función, tanto en el canal digital como en boletería física.
// Los dos canales pasan por acá, así que comparten el mismo inventario.
export async function venderEntradas({
  funcionId,
  cantidad,
  canal,
  usuarioId,
  vendedorId,
}) {
  if (!mongoose.isObjectIdOrHexString(funcionId)) {
    throw new ErrorBoleteria(
      400,
      "El identificador de la función no es válido",
    );
  }
  if (
    !Number.isInteger(cantidad) ||
    cantidad < 1 ||
    cantidad > MAX_POR_COMPRA
  ) {
    throw new ErrorBoleteria(
      400,
      `La cantidad debe ser un número entero entre 1 y ${MAX_POR_COMPRA}`,
    );
  }
  // La venta online se cierra al comenzar la función; en boletería se permite un rato más.
  const limiteVenta = new Date(
    Date.now() -
      (canal === "fisico" ? HORAS_VENTA_PUERTA_DESPUES * HORA_MS : 0),
  );

  // Reserva atómica: en UNA sola operación se comprueba que haya lugar y se descuenta.
  // Si dos compras llegan a la vez, la base las procesa una detrás de otra: no hay sobreventa.
  const funcion = await Funcion.findOneAndUpdate(
    {
      _id: funcionId,
      estado: "Programada",
      fecha: { $gt: limiteVenta },
      $expr: { $lte: [{ $add: ["$vendidas", cantidad] }, "$aforo"] },
    },
    { $inc: { vendidas: cantidad } },
    { returnDocument: "after" },
  );

  if (!funcion) {
    // No se pudo reservar: se averigua el motivo para dar un mensaje claro.
    const existente = await Funcion.findById(funcionId);
    if (!existente) throw new ErrorBoleteria(404, "La función no existe");
    if (existente.estado !== "Programada" || existente.fecha <= limiteVenta) {
      throw new ErrorBoleteria(
        409,
        "La función no está disponible para la venta",
      );
    }
    throw new ErrorBoleteria(
      409,
      `No hay suficientes entradas disponibles (quedan ${existente.disponibles})`,
    );
  }

  try {
    const entradas = await Entrada.insertMany(
      Array.from({ length: cantidad }, () => ({
        funcionId: funcion._id,
        canal,
        usuarioId,
        vendedorId,
        codigo: randomBytes(16).toString("base64url"),
      })),
    );
    return { funcion, entradas };
  } catch (error) {
    // Si no se pudieron crear las entradas, se devuelve el lugar reservado.
    await Funcion.updateOne(
      { _id: funcion._id },
      { $inc: { vendidas: -cantidad } },
    );
    throw error;
  }
}

const formatoFechaHora = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

// Valida una entrada en puerta: la marca como usada si estaba válida.
// Devuelve la entrada, su función (con la gira) y cuántas entradas ya ingresaron a esa función.
export async function validarEntrada({ codigo, validadorId }) {
  if (typeof codigo !== "string" || !codigo.trim() || codigo.length > 100) {
    throw new ErrorBoleteria(400, "Ingrese un código válido");
  }

  const entrada = await Entrada.findOne({ codigo: codigo.trim() }).populate({
    path: "funcionId",
    populate: { path: "giraId", select: "artista nombreTour" },
  });
  if (!entrada) {
    throw new ErrorBoleteria(404, "Código no válido: la entrada no existe");
  }

  const funcion = entrada.funcionId;
  if (entrada.estado === "usada") {
    const cuando = entrada.usadaEn
      ? ` (${formatoFechaHora.format(entrada.usadaEn)})`
      : "";
    throw new ErrorBoleteria(409, `Entrada ya utilizada${cuando}`);
  }
  if (entrada.estado === "anulada") {
    throw new ErrorBoleteria(409, "Entrada anulada");
  }
  if (!funcion || funcion.estado !== "Programada") {
    throw new ErrorBoleteria(409, "La función fue cancelada");
  }
  // Solo se puede validar dentro de la ventana de ingreso de ESTA función (se define al crearla).
  const inicio = funcion.fecha.getTime();
  const aperturaMin =
    funcion.aperturaAntesMin ?? VENTANA_INGRESO_DEFECTO.aperturaAntesMin;
  const cierreMin =
    funcion.cierreDespuesMin ?? VENTANA_INGRESO_DEFECTO.cierreDespuesMin;
  const abre = inicio - aperturaMin * MINUTO_MS;
  const cierra = inicio + cierreMin * MINUTO_MS;
  if (Date.now() < abre) {
    throw new ErrorBoleteria(
      409,
      `Todavía no se habilita el ingreso a esta función (abre el ${formatoFechaHora.format(new Date(abre))})`,
    );
  }
  if (Date.now() > cierra) {
    throw new ErrorBoleteria(409, "La función ya finalizó: la entrada venció");
  }

  // Marcado atómico: solo pasa a "usada" si SIGUE válida. Si dos puertas escanean la misma
  // entrada al mismo tiempo, la base deja pasar a una sola.
  const marcada = await Entrada.findOneAndUpdate(
    { _id: entrada._id, estado: "valida" },
    {
      $set: { estado: "usada", usadaEn: new Date(), validadaPor: validadorId },
    },
    { returnDocument: "after" },
  );
  if (!marcada) throw new ErrorBoleteria(409, "Entrada ya utilizada");

  const ingresaron = await Entrada.countDocuments({
    funcionId: funcion._id,
    estado: "usada",
  });
  return { entrada: marcada, funcion, ingresaron };
}
