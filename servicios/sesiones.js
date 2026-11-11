/*  lAS SESIONES SON REEMLAZADAS POR JWT, ESTE ARCHIVO YA NO SE USA. SE DEJA SOLO PARA RECORDAR CÓMO FUNCIONABA ANTES.
import { createHash, randomBytes } from "node:crypto";

import { DURACION_SESION_MS } from "../config/auth.js";
import Sesion from "../models/Sesion.js";
import Usuario from "../models/Usuario.js";

// Sesiones del lado del servidor: el navegador solo guarda un identificador al azar en una cookie
// y la base guarda a quién pertenece. Para cambiar de mecanismo (JWT, OAuth, etc.) se reemplaza este archivo.

const hashDelToken = (token) =>
  createHash("sha256").update(token).digest("hex");

// Crea una sesión nueva para el usuario y devuelve el identificador que va en la cookie.
export async function crearSesion(usuarioId) {
  const token = randomBytes(32).toString("base64url");
  await Sesion.create({
    tokenHash: hashDelToken(token),
    usuarioId,
    expiraEn: new Date(Date.now() + DURACION_SESION_MS),
  });
  return token;
}

// Devuelve el usuario dueño de la sesión, o null si no existe, venció o la cuenta está deshabilitada.
export async function buscarUsuarioPorToken(token) {
  if (typeof token !== "string" || token.length < 20 || token.length > 100)
    return null;

  const sesion = await Sesion.findOne({
    tokenHash: hashDelToken(token),
    expiraEn: { $gt: new Date() },
  });
  if (!sesion) return null;

  const usuario = await Usuario.findById(sesion.usuarioId);
  return usuario?.activo ? usuario : null;
}

export async function cerrarSesion(token) {
  if (typeof token !== "string") return;
  await Sesion.deleteOne({ tokenHash: hashDelToken(token) });
}
*/
