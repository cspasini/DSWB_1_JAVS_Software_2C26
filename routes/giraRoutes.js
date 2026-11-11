import { Router } from "express";
import * as giraController from "../controllers/giraController.js";
import { filtrarCamposGira } from "../middlewares/validarGira.js";
import { permitirRoles } from "../middlewares/seguridad.js";
import { ROL } from "../utils/roles.js";

const router = Router();

// Lecturas Publicas
router.get("/travesias", giraController.listarGiras); // Ruta para obtener todas las giras (Método GET)
router.get("/travesias/:id", giraController.obtenerGiraPorId); // RUTA DINÁMICA: El ':id' es un parámetro variable en la URL (Método GET)

// escritura, solo admin y representantes de espacios (ajustable, por ejemplo sumando ROl.ARTISTA
const puedeEditar = permitirRoles(ROL.ADMIN, ROL.ESPACIO);

router.post(
  "/travesias",
  puedeEditar,
  filtrarCamposGira,
  giraController.crearGira,
); // Ruta para dar de alta una nueva gira en la red de Urbana Cult (Método POST)
router.put(
  "/travesias/:id",
  puedeEditar,
  filtrarCamposGira,
  giraController.actualizarGira,
);
router.delete("/travesias/:id", puedeEditar, giraController.eliminarGira);

export default router;
