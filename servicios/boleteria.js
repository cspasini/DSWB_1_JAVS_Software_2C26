import { randomBytes } from "node:crypto";
import mongoose from "mongoose";

import Entrada from "../models/Entrada.js";
import Funcion from "../models/Funcion.js";

export const MAX_POR_COMPRA = 6;

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

  // Reserva atómica: en UNA sola operación se comprueba que haya lugar y se descuenta.
  // Si dos compras llegan a la vez, la base las procesa una detrás de otra: no hay sobreventa.
  const funcion = await Funcion.findOneAndUpdate(
    {
      _id: funcionId,
      estado: "Programada",
      fecha: { $gt: new Date() },
      $expr: { $lte: [{ $add: ["$vendidas", cantidad] }, "$aforo"] },
    },
    { $inc: { vendidas: cantidad } },
    { returnDocument: "after" },
  );

  if (!funcion) {
    // No se pudo reservar: se averigua el motivo para dar un mensaje claro.
    const existente = await Funcion.findById(funcionId);
    if (!existente) throw new ErrorBoleteria(404, "La función no existe");
    if (existente.estado !== "Programada" || existente.fecha <= new Date()) {
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
