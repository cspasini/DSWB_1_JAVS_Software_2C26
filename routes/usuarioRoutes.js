import { Router } from "express";

import {
  cambiarRol,
  listarUsuarios,
} from "../controllers/usuarioController.js";
import { permitirRoles } from "../middlewares/seguridad.js";
import { ROL } from "../utils/roles.js";

const router = Router();

router.get("/usuarios", permitirRoles(ROL.ADMIN), listarUsuarios);
router.patch("/usuarios/:id/rol", permitirRoles(ROL.ADMIN), cambiarRol);

export default router;
