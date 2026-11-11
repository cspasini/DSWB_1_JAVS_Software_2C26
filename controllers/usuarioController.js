import mongoose from "mongoose";
import Usuario from "../models/Usuario.js";
import { ROLES } from "../utils/roles.js";

//GET /api/usuarios (solo admin)
export const listarUsuarios = async (_req, res) => {
  const usuarios = await Usuario.find().sort({ createdAt: -1 });
  res.json(usuarios);
};

//PATCH /api/usuarios/:id/rol (solo admin)
export const cambiarRol = async (req, res) => {
  const { id } = req.params;
  const { rol } = req.body ?? {};

  if (!ROLES.includes(rol)) {
    return res
      .status(400)
      .json({
        mensaje: `Rol inválido. Valores permitidos: ${ROLES.join(", ")}`,
      });
  }

  // Evita que un admin se quite a sí mismo el rol de admin y deje el sistema sin administradores.
  if (id == req.usuario.id) {
    return res
      .status(400)
      .json({ mensaje: "No puedes cambiar tu propio rol." });
  }

  const actualizado = await Usuario.findByIdAndUpdate(
    id,
    { rol },
    { new: true, runValidators: true },
  );
  if (!actualizado) {
    return res.status(404).json({ mensaje: "Usuario no encontrado." });
  }
  res.json({ mensaje: "Rol actualizado correctamente.", usuario: actualizado });
};
