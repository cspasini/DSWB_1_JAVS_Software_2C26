import { Router } from "express";
import * as giraController from "../controllers/giraController.js";
import { filtrarCamposGira } from "../middlewares/validarGira.js";
import { proteger } from "../middlewares/seguridad.js";

const router = Router();

// Lecturas Publicas
router.get("/travesias", giraController.listarGiras); // Ruta para obtener todas las giras (Método GET)
router.get("/travesias/:id", giraController.obtenerGiraPorId); // RUTA DINÁMICA: El ':id' es un parámetro variable en la URL (Método GET)

// escritura, pasan por un middleware de proteccion para ususarios no autorizados(ver middlewares/seguridad.js)
router.post(
  "/travesias",
  proteger,
  filtrarCamposGira,
  giraController.crearGira,
); // Ruta para dar de alta una nueva gira en la red de Urbana Cult (Método POST)
router.put(
  "/travesias/:id",
  proteger,
  filtrarCamposGira,
  giraController.actualizarGira,
);
router.delete("/travesias/:id", proteger, giraController.eliminarGira);

export default router;
