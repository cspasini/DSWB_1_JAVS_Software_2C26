import { COOKIE_SESION, opcionesCookie } from "../config/auth.js";
import { buscarUsuarioPorToken } from "../servicios/tokens.js";
import { leerCookie } from "../utils/cookies.js";

// Capa de seguridad en tres pasos separados:
//   1) identificarUsuario: averigua QUIÉN hace la solicitud (hoy, por la cookie de sesión).
//   2) proteger / protegerPagina: deciden si ese usuario PUEDE entrar.
//   3) permitirRoles: deciden si ese usuario TiENE PERMISO para hacer la acción (autorizacion).

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
  } else {
    // Token vencido, alterado o cuenta deshabilitada: se descarta la cookie.
    res.clearCookie(COOKIE_SESION, opcionesCookie());
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

// Para rutas de la API restringidas por rol: 401 si no hay sesion, 403 si el rol no alcanza.
export const permitirRoles =
  (...rolesPermitidos) =>
  (req, res, next) => {
    if (!req.usuario) {
      return res
        .status(401)
        .json({ mensaje: "Debe iniciar sesión para realizar esta acción" });
    }
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res
        .status(403)
        .json({ mensaje: "No tiene permisos para realizar esta acción" });
    }
    next();
  };

// Para páginas: sin sesión redirige al ingreso. no-store evita que el botón "atrás" muestre la página tras cerrar sesión.
export function protegerPagina(req, res, next) {
  res.set("Cache-Control", "no-store");
  if (req.usuario) return next();
  res.redirect("/login");
}
