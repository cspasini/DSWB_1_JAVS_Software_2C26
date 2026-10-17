import {
  COOKIE_SESION,
  DURACION_SESION_MS,
  opcionesCookie,
} from "../config/auth.js";
import Usuario from "../models/Usuario.js";
import { cerrarSesion, crearSesion } from "../servicios/sesiones.js";
import {
  hashearClave,
  necesitaRehash,
  verificarClave,
} from "../utils/claves.js";
import { leerCookie } from "../utils/cookies.js";
import {
  estaBloqueado,
  limpiarFallos,
  registrarFallo,
} from "../utils/limitadorLogin.js";

// Mismo mensaje para "usuario inexistente" y "contraseña incorrecta": no revela qué usuarios existen.
const MENSAJE_CREDENCIALES = "Usuario o contraseña incorrectos";

// Hash de una contraseña que nadie tiene. Se compara cuando el usuario no existe,
// para que la respuesta tarde lo mismo y no se pueda distinguir ese caso por el tiempo.
const hashFalso = hashearClave("clave-que-nadie-tiene");

// Página de ingreso (si ya hay sesión, va directo al inicio)
export const mostrarLogin = (req, res) => {
  res.set("Cache-Control", "no-store");
  if (req.usuario) return res.redirect("/");
  res.render("login");
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

  const token = await crearSesion(encontrado.id); // identificador nuevo en cada ingreso
  res.cookie(COOKIE_SESION, token, {
    ...opcionesCookie(),
    maxAge: DURACION_SESION_MS,
  });
  res.json({
    mensaje: "Sesión iniciada",
    usuario: { usuario: encontrado.usuario, rol: encontrado.rol },
  });
};

// POST /api/auth/logout
export const logout = async (req, res) => {
  await cerrarSesion(leerCookie(req, COOKIE_SESION));
  res.clearCookie(COOKIE_SESION, opcionesCookie());
  res.json({ mensaje: "Sesión cerrada" });
};
