import { Router } from "express";
import { login, logout } from "../controllers/authController.js";

const router = Router();

router.post("/auth/login", login);
router.post("/auth/logout", logout);

export default router;
