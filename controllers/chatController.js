import mongoose from "mongoose";
import Gira from "../models/Gira.js";
import Mensaje from "../models/Mensaje.js";
import { consultarIA } from "../servicios/gemini.js";
import { emitirChat } from "../servicios/tiempoReal.js";

const PREFIJO_IA = "@asistente";

export async function historial(req, res) {
  const { giraId } = req.params;
  if (!mongoose.isValidObjectId(giraId)) {
    return res.status(400).json({ mensaje: "Travesía inválida" });
  }
  const mensajes = await Mensaje.find({ giraId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json(mensajes.reverse());
}

export async function enviarMensaje(req, res) {
  const { giraId, texto } = req.body;
  const limpio = typeof texto === "string" ? texto.trim() : "";

  if (!mongoose.isValidObjectId(giraId)) {
    return res.status(400).json({ mensaje: "Travesía inválida" });
  }
  if (!limpio || limpio.length > 500) {
    return res
      .status(400)
      .json({ mensaje: "El mensaje debe tener entre 1 y 500 caracteres." });
  }
  if (!(await Gira.exists({ _id: giraId }))) {
    return res.status(404).json({ mensaje: "La travesía no existe." });
  }

  const msg = await Mensaje.create({
    giraId,
    usuario: req.usuario.usuario,
    texto: limpio,
  });
  emitirChat(`gira:${giraId}`, msg);
  res.status(201).json(msg);

  // La IA responde después de contestar el POST: el usuario no espera a Gemini.
  if (!limpio.toLowerCase().startsWith(PREFIJO_IA)) return;

  let respuesta;
  try {
    respuesta = await consultarIA(
      limpio.slice(PREFIJO_IA.length).trim(),
      giraId,
    );
  } catch (error) {
    console.error("Error al consultar Gemini:", error);
    respuesta =
      "Disculpá, no pude procesar tu consulta en este momento. Probá de nuevo en unos minutos.";
  }

  try {
    const ia = await Mensaje.create({
      giraId,
      usuario: "Asistente IA",
      texto: respuesta.slice(0, 500),
      esIA: true,
    });
    emitirChat(`gira:${giraId}`, ia);
  } catch (error) {
    console.error("Error al guardar la respuesta de la IA:", error);
  }
}
