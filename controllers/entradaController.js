import mongoose from "mongoose";
import QRCode from "qrcode";

import Entrada from "../models/Entrada.js";
import {
  ErrorBoleteria,
  validarEntrada,
  venderEntradas,
} from "../servicios/boleteria.js";
import {
  emitirAforo,
  emitirIngreso,
  emitirVentaAlPersonal,
} from "../servicios/tiempoReal.js";
import { ROL } from "../utils/roles.js";

// Responde los errores de negocio con su código HTTP; los demás los atiende manejarErrores.
function responderError(res, error) {
  if (error instanceof ErrorBoleteria) {
    return res.status(error.status).json({ mensaje: error.message });
  }
  throw error;
}

// Lógica común a las dos ventas (digital y en boletería física).
async function registrarVenta(req, res, canal) {
  const { funcionId, cantidad } = req.body ?? {};

  try {
    const { funcion, entradas } = await venderEntradas({
      funcionId,
      cantidad: Number(cantidad ?? 1),
      canal,
      usuarioId: canal === "digital" ? req.usuario.id : undefined,
      vendedorId: canal === "fisico" ? req.usuario.id : undefined,
    });

    // El aforo cambió: se avisa a todos los que están mirando la cartelera.
    emitirAforo(funcion);
    emitirVentaAlPersonal({
      funcionId: funcion.id,
      canal,
      cantidad: entradas.length,
    });

    res.status(201).json({
      mensaje:
        entradas.length === 1
          ? "Entrada registrada correctamente"
          : `${entradas.length} entradas registradas correctamente`,
      disponibles: funcion.disponibles,
      entradas,
    });
  } catch (error) {
    responderError(res, error);
  }
}

// POST /api/entradas: compra digital (cualquier usuario con sesión)
export const comprar = (req, res) => registrarVenta(req, res, "digital");

// POST /api/entradas/fisica: venta en boletería (admin y espacio)
export const venderEnBoleteria = (req, res) =>
  registrarVenta(req, res, "fisico");

// GET /api/entradas/mias: entradas del usuario con sesión
export const misEntradas = async (req, res) => {
  const entradas = await Entrada.find({ usuarioId: req.usuario.id })
    .sort({ createdAt: -1 })
    .populate({
      path: "funcionId",
      select: "ciudad sala fecha giraId",
      populate: { path: "giraId", select: "artista nombreTour" },
    });
  res.json(entradas);
};

// GET /api/entradas/:id/qr: imagen QR (SVG) de una entrada. La ve su dueño o el personal.
export const qrEntrada = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) {
    return res.status(400).json({ mensaje: "El identificador no es válido" });
  }

  const entrada = await Entrada.findById(id);
  const esDuenio =
    entrada?.usuarioId && String(entrada.usuarioId) === req.usuario.id;
  const esPersonal = [ROL.ADMIN, ROL.ESPACIO].includes(req.usuario.rol);

  // Mismo 404 si no existe o no es suya: no se revela qué entradas existen.
  if (!entrada || !(esDuenio || esPersonal)) {
    return res.status(404).json({ mensaje: "La entrada no existe" });
  }

  const svg = await QRCode.toString(entrada.codigo, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
  });
  res.type("image/svg+xml").set("Cache-Control", "private, no-store").send(svg);
};

// POST /api/entradas/validar: validación en puerta (admin y espacio)
export const validar = async (req, res) => {
  try {
    const { entrada, funcion, ingresaron } = await validarEntrada({
      codigo: req.body?.codigo,
      validadorId: req.usuario.id,
    });

    const gira = funcion.giraId; // poblada con artista y nombreTour (puede ser null si se borró)
    const ingreso = {
      entradaId: entrada.id,
      funcionId: funcion.id,
      artista: gira?.artista ?? "",
      nombreTour: gira?.nombreTour ?? "",
      ciudad: funcion.ciudad,
      sala: funcion.sala,
      canal: entrada.canal,
      ingresaron,
      vendidas: funcion.vendidas,
      hora: entrada.usadaEn,
      validador: req.usuario.usuario,
    };

    emitirIngreso(ingreso); // todas las puertas ven el ingreso al instante
    res.json({ mensaje: "Entrada válida: acceso permitido", ...ingreso });
  } catch (error) {
    responderError(res, error);
  }
};
