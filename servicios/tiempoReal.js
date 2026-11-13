import { Server } from "socket.io";

import { COOKIE_SESION } from "../config/auth.js";
import { leerCookie } from "../utils/cookies.js";
import { ROL } from "../utils/roles.js";
import { buscarUsuarioPorToken, verificarToken } from "./tokens.js";

// WebSocket solo para AVISAR cambios a los clientes. Las acciones (comprar, editar) siguen
// entrando por la API REST, donde se validan permisos y datos.
const SALA_GENERAL = "general"; // todos los usuarios con sesión
const SALA_PERSONAL = "personal"; // solo admin y espacio

let io = null;

export function iniciarTiempoReal(servidorHttp) {
  io = new Server(servidorHttp); // mismo origen que la web: no se habilita CORS

  // Autenticación del socket: se usa la misma cookie httpOnly con el JWT.
  io.use(async (socket, next) => {
    try {
      const token = leerCookie(socket.request, COOKIE_SESION);
      const payload = verificarToken(token);
      const usuario = payload ? await buscarUsuarioPorToken(token) : null;
      if (!usuario) return next(new Error("No autenticado"));

      socket.data.usuario = {
        id: usuario.id,
        usuario: usuario.usuario,
        rol: usuario.rol,
      };
      socket.data.venceEn = payload.exp * 1000;
      next();
    } catch {
      next(new Error("No autenticado"));
    }
  });

  io.on("connection", (socket) => {
    const { rol } = socket.data.usuario;
    socket.join(SALA_GENERAL);
    if (rol === ROL.ADMIN || rol === ROL.ESPACIO) socket.join(SALA_PERSONAL);

    socket.join(`usuario:${socket.data.usuario.id}`); // sala privada para avisos personales

    // El cliente pide escuchar el chat de una gira. Solo escucha: escribir va por REST.
    socket.on("chat:unirse", (giraId) => {
      if (typeof giraId === "string" && /^[a-f\d]{24}$/i.test(giraId)) {
        socket.join(`gira:${giraId}`);
      }
    });
    socket.on("chat:salir", (giraId) => {
      if (typeof giraId === "string") socket.leave(`gira:${giraId}`);
    });

    // Cuando vence el JWT se corta el socket (la conexión no puede durar más que la sesión).
    const temporizador = setTimeout(
      () => socket.disconnect(true),
      Math.max(0, socket.data.venceEn - Date.now()),
    );
    socket.on("disconnect", () => clearTimeout(temporizador));
  });

  return io;
}

// Los controladores llaman a estas funciones DESPUÉS de guardar en la base.
// El "?." hace que no fallen si el servidor de sockets no está iniciado.

export function emitirAforo(funcion) {
  io?.to(SALA_GENERAL).emit("aforo:actualizado", {
    funcionId: funcion.id,
    giraId: String(funcion.giraId),
    aforo: funcion.aforo,
    vendidas: funcion.vendidas,
    disponibles: funcion.aforo - funcion.vendidas,
  });
}

export function emitirCartelera(cambio) {
  io?.to(SALA_GENERAL).emit("cartelera:cambio", cambio); // { entidad, accion, id }
}

export function emitirVentaAlPersonal(venta) {
  io?.to(SALA_PERSONAL).emit("entrada:vendida", venta);
}

// Un ingreso validado en cualquier puerta se avisa a todo el personal.
export function emitirIngreso(ingreso) {
  io?.to(SALA_PERSONAL).emit("entrada:validada", ingreso);
}

export function emitirChat(sala, mensaje) {
  io?.to(sala).emit("chat:mensaje", mensaje);
}
