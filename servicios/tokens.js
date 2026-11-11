import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import {
  DURACION_SESION_MS,
  JWT_AUDIENCE,
  JWT_ISSUER,
} from "../config/auth.js";
import Usuario from "../models/Usuario.js";

// Autencticacion con JWT firmado (HS256), El token viaja en una cookie httpOnly
const ALGORITMO = "HS256";

function obtenerSecreto() {
  const secreto = process.env.JWT_SECRET;
  if (!secreto || secreto.length < 32) {
    throw new Error(
      "JWT_SECRET no está definido o es demasiado corto. Debe ser de al menos 32 caracteres.",
    );
  }
  return secreto;
}

// Se llama al arrancar para fallar rapido si no hay configuracion.
export function validarConfiguracionAuth() {
  obtenerSecreto();
}

//Payload minimo: id del usuario y rol (nada sensible). Se puede agregar mas info si se desea.
export function firmarToken(usuario) {
  return jwt.sign({ rol: usuario.rol }, obtenerSecreto(), {
    algorithm: ALGORITMO,
    expiresIn: Math.floor(DURACION_SESION_MS / 1000), //en segundos
    subject: String(usuario._id),
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

// Devuelve el payload si el token es valido y no vencio, o null si no es valido.
export function verificarToken(token) {
  if (typeof token !== "string" || token.length > 1000) return null;
  const secreto = obtenerSecreto();
  try {
    return jwt.verify(token, secreto, {
      algorithms: [ALGORITMO], //Evita aceptar otros algoritmos
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  } catch {
    return null; //Vencido, alterado o mal formado
  }
}

// Devuelve el usuario dueño del token, o null si no existe, vencio o la cuenta esta deshabilitada.
// El usuario se relee de la base para que se apliquen cambios de rol o deshabilitacion de cuenta.
//Se aplican de inmediato, sin esperar a que caduque el token. Esto es importante para poder deshabilitar cuentas o cambiar roles sin tener que esperar a que caduque el token.
export async function buscarUsuarioPorToken(token) {
  const payload = verificarToken(token);
  if (!payload?.sub || !mongoose.isValidObjectId(payload.sub)) return null;

  const usuario = await Usuario.findById(payload.sub);
  return usuario?.activo ? usuario : null;
}
