// Se reemplazo la tecnologia Common JS por ECMAScript Modules (ESM) para aprovechar las ventajas de import/export y la compatibilidad con herramientas modernas.
import "dotenv/config"; // Carga variables de entorno desde un archivo .env
import express from "express";
import path from "path"; // Módulo nativo para manejar rutas de carpetas
import { fileURLToPath } from "url"; // Para obtener la ruta del archivo actual
import { modulos } from "./config/modulos.js";
import chatRoutes from "./routes/chatRoutes.js";
import {
  identificarUsuario,
  permitirRolesPagina,
  protegerPagina,
} from "./middlewares/seguridad.js";
import authRoutes from "./routes/authRoutes.js";
import usuarioRoutes from "./routes/usuarioRoutes.js";
import { mostrarLogin, mostrarRegistro } from "./controllers/authController.js";
import { validarConfiguracionAuth } from "./servicios/tokens.js";
import { ROL } from "./utils/roles.js"; // Importamos los roles definidos en el sistema

import http from "node:http";
import funcionRoutes from "./routes/funcionRoutes.js";
import entradaRoutes from "./routes/entradaRoutes.js";
import { iniciarTiempoReal } from "./servicios/tiempoReal.js";

import { conectarDB } from "./config/db.js"; // Importamos la función para conectar a la base de datos
import { manejarErrores, rutaNoEncontrada } from "./middlewares/errores.js"; // Importamos los middlewares de manejo de errores
import giraRoutes from "./routes/giraRoutes.js"; // Importamos las rutas de giras
import { mostrarCartelera } from "./controllers/giraController.js"; // Importamos el controlador para mostrar la cartelera

//En ES Modules no existe __dirname, por lo que se reconstruye desde import.meta.url
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3127;

// CONFIGURACIÓN DE PUG (Motor de plantillas)
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// Middleware base
app.use(express.json({ limit: "10kb" })); // Para parsear JSON con límite de tamaño
app.use(express.static(path.join(__dirname, "public"))); // Servir archivos estáticos desde la carpeta 'public'

app.use(identificarUsuario); // Lee el JWT de la cookie y lo pone en req.usuario (si hay sesión)

//API REST
app.use("/api", authRoutes); // Registro, login, logout y perfil
app.use("/api", usuarioRoutes); // Rutas de la API para administrar usuarios y roles  (solo admin)
app.use("/api", giraRoutes); // Rutas de la API para giras
app.use("/api", funcionRoutes); // Rutas de la API para funciones
app.use("/api", entradaRoutes); // Rutas de la API para entradas
app.use("/api", chatRoutes); // Rutas de la API del chat

app.get("/login", mostrarLogin); // Vista del login
app.get("/registro", mostrarRegistro); // Vista de registro
app.get("/cartelera", protegerPagina, mostrarCartelera); // Vista web de la cartelera
app.get(
  "/admin/usuarios",
  protegerPagina,
  permitirRolesPagina(ROL.ADMIN),
  (_req, res) => {
    res.render("usuarios");
  },
);
app.get("/", protegerPagina, (req, res) => {
  // Cada usuario ve solo los módulos permitidos para su rol
  const visibles = modulos.filter(
    (m) => !m.roles || m.roles.includes(req.usuario.rol),
  );
  res.render("inicio", { modulos: visibles });
});
app.get("/boleteria", protegerPagina, (_req, res) => {
  res.render("boleteria");
});
app.get(
  "/acceso",
  protegerPagina,
  permitirRolesPagina(ROL.ADMIN, ROL.ESPACIO),
  (_req, res) => {
    res.render("acceso");
  },
);
app.get("/chat", protegerPagina, (_req, res) => {
  res.render("chat");
});
// 404 y manejo de errores
app.use(rutaNoEncontrada);
app.use(manejarErrores);

// Conectamos a la base de datos antes de iniciar el servidor
async function iniciar() {
  validarConfiguracionAuth(); // Falla al arrancar si falta JWT_SECRET
  await conectarDB(); // Conexión a la base de datos

  const servidor = http.createServer(app); // Express y Socket.IO comparten el mismo servidor
  iniciarTiempoReal(servidor);

  servidor.listen(PORT, () => {
    console.log(
      `[JAVS] Servidor de Urbana Cult corriendo en http://localhost:${PORT}`,
    );
  });
}

// Llamamos a la función para iniciar el servidor
iniciar().catch((error) => {
  console.error(`[JAVS] Error al iniciar el servidor: ${error.message}`);
  process.exit(1); // Salimos del proceso con un código de error
});
