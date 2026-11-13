import { consultarIA } from "./gemini.js";
import Mensaje from "../models/Mensaje.js";

export const registrarChat = (io) => {
  io.on("connection", (socket) => {
    const user = socket.data.usuario; // lo setea el middleware JWT

    socket.on("chat:unirse", (giraId) => socket.join(`gira:${giraId}`));

    socket.on("chat:mensaje", async ({ giraId, texto }) => {
      if (!texto || texto.length > 500) return;
      const sala = `gira:${giraId}`;
      const msg = await Mensaje.create({ sala, usuario: user.nombre, texto });
      io.to(sala).emit("chat:mensaje", msg);

      if (texto.startsWith("@asistente")) {
        try {
          const respuesta = await consultarIA(
            texto.replace("@asistente", "").trim(),
          );
          const ia = await Mensaje.create({
            sala,
            usuario: "Asistente IA",
            texto: respuesta,
            esIA: true,
          });
          io.to(sala).emit("chat:mensaje", ia);
        } catch (e) {
          console.error("Error Gemini:", e);
          io.to(sala).emit("chat:mensaje", {
            usuario: "Asistente IA",
            texto: "Disculpá, no pude procesar tu consulta en este momento.",
            esIA: true,
          });
        }
      }
    });
  });
};
