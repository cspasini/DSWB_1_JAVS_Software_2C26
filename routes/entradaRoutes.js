import { Router } from "express";

import {
  comprar,
  misEntradas,
  venderEnBoleteria,
} from "../controllers/entradaController.js";
import { permitirRoles, proteger } from "../middlewares/seguridad.js";
import { ROL } from "../utils/roles.js";

const router = Router();

router.post("/entradas", proteger, comprar); // compra digital
router.post(
  "/entradas/fisica",
  permitirRoles(ROL.ADMIN, ROL.ESPACIO),
  venderEnBoleteria,
);
router.get("/entradas/mias", proteger, misEntradas);

export default router;
