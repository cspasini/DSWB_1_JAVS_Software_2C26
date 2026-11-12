import { Router } from "express";

import {
  actualizarFuncion,
  crearFuncion,
  eliminarFuncion,
  listarFunciones,
  obtenerFuncion,
} from "../controllers/funcionController.js";
import { permitirRoles } from "../middlewares/seguridad.js";
import {
  filtrarCamposFuncionEdicion,
  filtrarCamposFuncionNueva,
} from "../middlewares/validarFuncion.js";
import { ROL } from "../utils/roles.js";

const router = Router();

// Lecturas públicas (igual que las giras)
router.get("/funciones", listarFunciones);
router.get("/funciones/:id", obtenerFuncion);

// Escritura: solo admin y representantes de espacios
const puedeEditar = permitirRoles(ROL.ADMIN, ROL.ESPACIO);
router.post("/funciones", puedeEditar, filtrarCamposFuncionNueva, crearFuncion);
router.put(
  "/funciones/:id",
  puedeEditar,
  filtrarCamposFuncionEdicion,
  actualizarFuncion,
);
router.delete("/funciones/:id", puedeEditar, eliminarFuncion);

export default router;
