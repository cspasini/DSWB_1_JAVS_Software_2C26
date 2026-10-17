import { COOKIE_SESION } from "../config/auth.js";
import { buscarUsuarioPorToken } from "../servicios/sesiones.js";
import { leerCookie } from "../utils/cookies.js";

// Capa de seguridad en dos pasos separados:
//   1) identificarUsuario: averigua QUIÉN hace la solicitud (hoy, por la cookie de sesión).
//   2) proteger / protegerPagina: deciden si ese usuario PUEDE entrar.

export function aplicarSeguridad(_app) {}

// Deja el usuario en req.usuario (o null) y en res.locals.usuario para que lo vean las vistas Pug.
export async function identificarUsuario(req, res, next) {
  req.usuario = null;

  const token = leerCookie(req, COOKIE_SESION);
  if (token) {
    const usuario = await buscarUsuarioPorToken(token);
    if (usuario)
      req.usuario = {
        id: usuario.id,
        usuario: usuario.usuario,
        rol: usuario.rol,
      };
  }

  res.locals.usuario = req.usuario;
  next();
}

// Para rutas de la API: sin sesión responde 401.
export function proteger(req, res, next) {
  if (req.usuario) return next();
  res
    .status(401)
    .json({ mensaje: "Debe iniciar sesión para realizar esta acción" });
}

// Para páginas: sin sesión redirige al ingreso. no-store evita que el botón "atrás" muestre la página tras cerrar sesión.
export function protegerPagina(req, res, next) {
  res.set("Cache-Control", "no-store");
  if (req.usuario) return next();
  res.redirect("/login");
}
