import { Router } from "express";
import {
  login,
  logout,
  perfil,
  registro,
} from "../controllers/authController.js";
import { proteger } from "../middlewares/seguridad.js";

const router = Router();

router.post("/auth/registro", registro);
router.post("/auth/login", login);
router.post("/auth/logout", logout);
router.get("/auth/me", proteger, perfil);

export default router;
