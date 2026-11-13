import { Router } from "express";
import { proteger } from "../middlewares/seguridad.js";
import { enviarMensaje, historial } from "../controllers/chatController.js";

const router = Router();

// Límite simple por usuario, en memoria: protege el chat y la cuota de Gemini.
const MAX_MENSAJES = 10; // por ventana
const VENTANA_MS = 60_000;
const registro = new Map(); // usuarioId -> { cantidad, desde }

function limitarMensajes(req, res, next) {
  const ahora = Date.now();
  const actual = registro.get(req.usuario.id);

  if (!actual || ahora - actual.desde > VENTANA_MS) {
    registro.set(req.usuario.id, { cantidad: 1, desde: ahora });
    return next();
  }
  if (actual.cantidad >= MAX_MENSAJES) {
    return res
      .status(429)
      .json({ mensaje: "Enviaste demasiados mensajes. Esperá un minuto." });
  }
  actual.cantidad++;
  next();
}

// Limpieza periódica para que el Map no crezca indefinidamente.
setInterval(() => {
  const ahora = Date.now();
  for (const [id, r] of registro) {
    if (ahora - r.desde > VENTANA_MS) registro.delete(id);
  }
}, VENTANA_MS).unref();

router.get("/chat/:giraId", proteger, historial);
router.post("/chat", proteger, limitarMensajes, enviarMensaje);

export default router;
