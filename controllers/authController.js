import {
  COOKIE_SESION,
  DURACION_SESION_MS,
  opcionesCookie,
} from "../config/auth.js";
import Usuario from "../models/Usuario.js";
import { firmarToken } from "../servicios/tokens.js";
import {
  hashearClave,
  necesitaRehash,
  validarClaveNueva,
  verificarClave,
} from "../utils/claves.js";
//import { leerCookie } from "../utils/cookies.js";
import {
  estaBloqueado,
  limpiarFallos,
  registrarFallo,
} from "../utils/limitadorLogin.js";
import { ROL } from "../utils/roles.js";

// Mismo mensaje para "usuario inexistente" y "contraseña incorrecta": no revela qué usuarios existen.
const MENSAJE_CREDENCIALES = "Usuario o contraseña incorrectos";

// Hash de una contraseña que nadie tiene. Se compara cuando el usuario no existe,
// para que la respuesta tarde lo mismo y no se pueda distinguir ese caso por el tiempo.
const hashFalso = hashearClave("clave-que-nadie-tiene");

// Emite el JWT y lo deja en la cookie httpOnly.
function iniciarSesionEn(res, usuario) {
  res.cookie(COOKIE_SESION, firmarToken(usuario), {
    ...opcionesCookie(),
    maxAge: DURACION_SESION_MS,
  });
}

const datosPublicos = (U) => ({ usuario: U.usuario, rol: U.rol });

// Página de ingreso (si ya hay sesión, va directo al inicio)
export const mostrarLogin = (req, res) => {
  res.set("Cache-Control", "no-store");
  if (req.usuario) return res.redirect("/");
  res.render("login");
};

// Página de registro (si ya hay sesión, va directo al inicio)
export const mostrarRegistro = (req, res) => {
  res.set("Cache-Control", "no-store");
  if (req.usuario) return res.redirect("/");
  res.render("registro");
};

// POST /api/auth/registro
// Cualquiera puede registrarse, pero SIEMPRE como "publico": un admin asigna otros roles despues.
export const registro = async (req, res) => {
  const { usuario, clave } = req.body ?? {};

  if (
    typeof usuario !== "string" ||
    typeof clave !== "string" ||
    !usuario.trim() ||
    !clave ||
    clave.length > 128
  ) {
    return res.status(400).json({ mensaje: "Ingrese usuario y contraseña" });
  }

  const problema = await validarClaveNueva(clave);
  if (problema) return res.status(400).json({ mensaje: problema });

  try {
    const creado = await Usuario.create({
      usuario: usuario.trim(),
      claveHash: await hashearClave(clave),
      rol: ROL.PUBLICO, //se ignora cualquier rol que venga en el body, para que nadie se registre como admin
    });
    iniciarSesionEn(res, creado);
    res
      .status(201)
      .json({ mensaje: "Usuario registrado", usuario: datosPublicos(creado) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ mensaje: "El usuario ya existe" });
    }
    if (error.name === "ValidationError") {
      const [primero] = Object.values(error.errors);
      return res.status(400).json({ mensaje: primero.message });
    }
    throw error;
  }
};

// POST /api/auth/login
export const login = async (req, res) => {
  const { usuario, clave } = req.body ?? {};

  if (
    typeof usuario !== "string" ||
    typeof clave !== "string" ||
    !usuario.trim() ||
    !clave ||
    clave.length > 128
  ) {
    return res.status(400).json({ mensaje: "Ingrese usuario y contraseña" });
  }

  const nombre = usuario.trim().toLowerCase();
  const claveDeIntentos = `${req.ip}|${nombre}`;

  if (estaBloqueado(claveDeIntentos)) {
    return res.status(429).json({
      mensaje:
        "Demasiados intentos fallidos. Espere unos minutos antes de volver a intentar.",
    });
  }

  const encontrado = await Usuario.findOne({ usuario: nombre }).select(
    "+claveHash",
  );
  const claveValida = await verificarClave(
    clave,
    encontrado ? encontrado.claveHash : await hashFalso,
  );

  if (!encontrado || !encontrado.activo || !claveValida) {
    registrarFallo(claveDeIntentos);
    return res.status(401).json({ mensaje: MENSAJE_CREDENCIALES });
  }

  limpiarFallos(claveDeIntentos);

  // Si se endurecieron los parámetros del hash, se regenera en este ingreso (única vez que se conoce la contraseña).
  if (necesitaRehash(encontrado.claveHash)) {
    encontrado.claveHash = await hashearClave(clave);
    await encontrado.save();
  }

  iniciarSesionEn(res, encontrado); //token nuevo en cada ingreso
  res.json({
    mensaje: "Sesión iniciada",
    usuario: datosPublicos(encontrado),
  });
};
/* YA NO SE CREAN SESIONES EN LA BASE DE DATOS, SOLO SE USA EL JWT EN LA COOKIE
  const token = await crearSesion(encontrado.id); // identificador nuevo en cada ingreso
  res.cookie(COOKIE_SESION, token, {
    ...opcionesCookie(),
    maxAge: DURACION_SESION_MS,
  });
  res.json({
    mensaje: "Sesión iniciada",
    usuario: { usuario: encontrado.usuario, rol: encontrado.rol },
  });
};*/

// POST /api/auth/logout
export const logout = async (_req, res) => {
  res.clearCookie(COOKIE_SESION, opcionesCookie());
  res.json({ mensaje: "Sesión cerrada" });
};

// GET /api/auth/me: el front no puede leer la cookie httpOnly, asi que consulta aquí quien es y que rol tiene.
export const perfil = (req, res) => {
  res.json({ usuario: datosPublicos(req.usuario) });
};
