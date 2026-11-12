import mongoose from "mongoose";

import Funcion from "../models/Funcion.js";
import Gira from "../models/Gira.js";
import { emitirAforo, emitirCartelera } from "../servicios/tiempoReal.js";

const idValido = (id) => mongoose.isObjectIdOrHexString(id);

const idInvalido = (res) =>
  res.status(400).json({ mensaje: "El identificador no es válido" });

const noExiste = (res) =>
  res.status(404).json({ mensaje: "La función no existe" });

// GET /api/funciones?giraId=...  (las más próximas primero)
export const listarFunciones = async (req, res) => {
  const filtro = {};
  if (req.query.giraId !== undefined) {
    if (!idValido(req.query.giraId)) return idInvalido(res);
    filtro.giraId = req.query.giraId;
  }
  const funciones = await Funcion.find(filtro).sort({ fecha: 1 });
  res.json(funciones);
};

// GET /api/funciones/:id
export const obtenerFuncion = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) return idInvalido(res);

  const funcion = await Funcion.findById(id);
  if (!funcion) return noExiste(res);
  res.json(funcion);
};

// POST /api/funciones (admin y espacio)
export const crearFuncion = async (req, res) => {
  const { giraId } = req.datosFuncion;
  if (!idValido(giraId)) {
    return res
      .status(400)
      .json({ mensaje: "La travesía indicada no es válida" });
  }
  if (!(await Gira.exists({ _id: giraId }))) {
    return res.status(404).json({ mensaje: "La travesía no existe" });
  }

  const funcion = await Funcion.create(req.datosFuncion);
  emitirCartelera({
    entidad: "funcion",
    accion: "creada",
    id: funcion.id,
    giraId,
  });
  res.status(201).json({ mensaje: "Función creada correctamente", funcion });
};

// PUT /api/funciones/:id (admin y espacio)
export const actualizarFuncion = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) return idInvalido(res);

  const datos = req.datosFuncion;
  if (Object.keys(datos).length === 0) {
    return res
      .status(400)
      .json({ mensaje: "No se enviaron campos para actualizar" });
  }

  const filtro = { _id: id };
  // El aforo nunca puede quedar por debajo de lo ya vendido.
  const aforoNuevo = Number(datos.aforo);
  if (datos.aforo !== undefined && Number.isInteger(aforoNuevo)) {
    filtro.vendidas = { $lte: aforoNuevo };
  }

  const funcion = await Funcion.findOneAndUpdate(filtro, datos, {
    returnDocument: "after",
    runValidators: true,
  });

  if (!funcion) {
    if (!(await Funcion.exists({ _id: id }))) return noExiste(res);
    return res.status(409).json({
      mensaje: "El aforo no puede ser menor a las entradas ya vendidas",
    });
  }

  emitirAforo(funcion);
  emitirCartelera({
    entidad: "funcion",
    accion: "actualizada",
    id: funcion.id,
    giraId: String(funcion.giraId),
  });
  res.json({ mensaje: "Función actualizada correctamente", funcion });
};

// DELETE /api/funciones/:id (admin y espacio): solo si no tiene entradas vendidas
export const eliminarFuncion = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) return idInvalido(res);

  const funcion = await Funcion.findOneAndDelete({ _id: id, vendidas: 0 });
  if (!funcion) {
    if (!(await Funcion.exists({ _id: id }))) return noExiste(res);
    return res.status(409).json({
      mensaje:
        "No se puede eliminar una función con entradas vendidas. Cancélela en su lugar.",
    });
  }

  emitirCartelera({
    entidad: "funcion",
    accion: "eliminada",
    id,
    giraId: String(funcion.giraId),
  });
  res.json({ mensaje: "Función eliminada", funcion });
};
