// Crea un usuario, o cambia la contraseña de uno existente. La contraseña se pide por consola (no queda en el historial).
//   node scripts/crear-usuario.js <usuario> [rol]          -> crea el usuario (rol por defecto: admin)
//   node scripts/crear-usuario.js <usuario> --actualizar   -> cambia la contraseña de un usuario existente
import "dotenv/config";
import mongoose from "mongoose";

import { conectarDB } from "../config/db.js";
import Sesion from "../models/Sesion.js";
import Usuario, { ROLES } from "../models/Usuario.js";
import { hashearClave, validarClaveNueva } from "../utils/claves.js";
import { preguntarOculto } from "../utils/consola.js";

const actualizar = process.argv.includes("--actualizar");
const [nombreCrudo, rol = "admin"] = process.argv
  .slice(2)
  .filter((argumento) => !argumento.startsWith("--"));

function terminar(mensaje) {
  console.error(`[JAVS] ${mensaje}`);
  process.exit(1);
}

if (!nombreCrudo)
  terminar("Uso: node scripts/crear-usuario.js <usuario> [rol] [--actualizar]");
if (!ROLES.includes(rol))
  terminar(`Rol inválido. Valores permitidos: ${ROLES.join(", ")}`);

const nombre = nombreCrudo.trim().toLowerCase();

const clave = await preguntarOculto("Contraseña: ");
const repeticion = await preguntarOculto("Repetir contraseña: ");
if (clave !== repeticion) terminar("Las contraseñas no coinciden");

const problema = validarClaveNueva(clave);
if (problema) terminar(problema);

try {
  await conectarDB();
  const claveHash = await hashearClave(clave);
  const existente = await Usuario.findOne({ usuario: nombre });

  if (existente) {
    if (!actualizar) {
      throw new Error(
        `El usuario "${nombre}" ya existe. Use --actualizar para cambiarle la contraseña.`,
      );
    }
    await Usuario.updateOne({ _id: existente._id }, { claveHash });
    await Sesion.deleteMany({ usuarioId: existente._id }); // cierra las sesiones que tuviera abiertas
    console.log(`[JAVS] Contraseña actualizada para "${nombre}"`);
  } else {
    if (actualizar) throw new Error(`El usuario "${nombre}" no existe.`);
    await Usuario.create({ usuario: nombre, claveHash, rol });
    console.log(`[JAVS] Usuario "${nombre}" creado con rol ${rol}`);
  }
} catch (error) {
  console.error(`[JAVS] ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
