import mongoose from "mongoose";
import Gira, { ESTADOS } from "../models/Gira.js";
import Funcion from "../models/Funcion.js";
import { emitirCartelera } from "../servicios/tiempoReal.js";

const idValido = (id) => mongoose.isObjectIdOrHexString(id);

const idInvalido = (res) =>
  res
    .status(400)
    .json({ mensaje: "El identificador de la Travesia Cultural no es válido" });

const noExiste = (res) =>
  res.status(404).json({ mensaje: "La travesia Culltural no existe" });

// 1. Controlador para listar todas las giras (Formato JSON)
export const listarGiras = async (_req, res) => {
  const giras = await Gira.find().sort({ createdAt: -1 });
  res.json(giras);
};

// 2. Controlador para buscar una gira específica por ID (Uso de Ruta Dinámica)
export const obtenerGiraPorId = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) return idInvalido(res);

  const gira = await Gira.findById(id);
  if (!gira) return noExiste(res);

  res.json(gira);
};

// 3. Crear una Gira
export const crearGira = async (req, res) => {
  const gira = await Gira.create(req.datosGira);
  emitirCartelera({ entidad: "gira", accion: "creada", id: gira.id });
  res.status(201).json({
    mensaje: "¡Travesía Cultural confirmada y publicada en bloque con éxito!",
    gira,
  });
};

// 4. Actualizar una gira (acepta los campos que se quieran cambiar)
export const actualizarGira = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) return idInvalido(res);

  if (Object.keys(req.datosGira).length === 0) {
    return res
      .status(400)
      .json({ mensaje: "No se enviaron campos para actualizar" });
  }

  const gira = await Gira.findByIdAndUpdate(id, req.datosGira, {
    returnDocument: "after",
    runValidators: true, // aplica las validaciones del esquema tambien al editar
  });
  if (!gira) return noExiste(res);
  emitirCartelera({ entidad: "gira", accion: "actualizada", id: gira.id });
  res.json({ mensaje: "Travesía Cultural actuaizada correctamente", gira });
};

// 5. Eliminar una gira
export const eliminarGira = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) return idInvalido(res);

  // Una gira con entradas vendidas no se puede borrar (primero hay que reprogramar o cancelar).
  if (await Funcion.exists({ giraId: id, vendidas: { $gt: 0 } })) {
    return res.status(409).json({
      mensaje: "No se puede eliminar una travesía con entradas vendidas",
    });
  }

  const gira = await Gira.findByIdAndDelete(id);
  if (!gira) return noExiste(res);

  await Funcion.deleteMany({ giraId: id }); // sus funciones (sin ventas) se eliminan con ella
  emitirCartelera({ entidad: "gira", accion: "eliminada", id });

  res.json({ mensaje: "Travesía Cultural eliminada de la cartelera", gira });
};

// Vista: cartelera renderizada con Pug (el front luego la edita con fetch)
export const mostrarCartelera = async (_req, res) => {
  try {
    const giras = await Gira.find().sort({ createdAt: -1 });
    res.render("listaGiras", {
      giras: giras.map((g) => g.toJSON()),
      estados: ESTADOS,
    });
  } catch (error) {
    console.error("[JAVS] Error al renderizar la cartelera:", error);
    res.status(500).send("Error al cargar la cartelera de Urbana Cult");
  }
};
