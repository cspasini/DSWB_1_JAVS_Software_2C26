import { Router } from "express";

import {
  comprar,
  misEntradas,
  qrEntrada,
  validar,
  venderEnBoleteria,
} from "../controllers/entradaController.js";
import { permitirRoles, proteger } from "../middlewares/seguridad.js";
import { ROL } from "../utils/roles.js";

const router = Router();
const esPersonal = permitirRoles(ROL.ADMIN, ROL.ESPACIO);

router.post("/entradas", proteger, comprar); // compra digital
router.post("/entradas/fisica", esPersonal, venderEnBoleteria); //venta en boletería física
router.post("/entradas/validar", esPersonal, validar); // validación en puerta
router.get("/entradas/mias", proteger, misEntradas);
router.get("/entradas/:id/qr", proteger, qrEntrada); // imagen QR de una entrada

export default router;
