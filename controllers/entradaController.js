import Entrada from "../models/Entrada.js";
import { ErrorBoleteria, venderEntradas } from "../servicios/boleteria.js";
import { emitirAforo, emitirVentaAlPersonal } from "../servicios/tiempoReal.js";

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
    if (error instanceof ErrorBoleteria) {
      return res.status(error.status).json({ mensaje: error.message });
    }
    throw error; // lo atiende manejarErrores
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
