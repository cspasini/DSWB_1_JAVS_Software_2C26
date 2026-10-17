import mongoose from "mongoose";

const URI_POR_DEFECTO = "mongodb://127.0.0.1:27017/urbana_cult"; // URI de conexión por defecto

// Conecta con MongoDB.
export async function conectarDB() {
  const uri = process.env.MONGODB_URI || URI_POR_DEFECTO; // Usa la URI de entorno si está definida, sino la por defecto

  mongoose.connection.on("disconnected", () => {
    console.log("[JAVS] Conexión a MongoDB cerrada");
  });

  // falla rapida (5s) si no puede conectarse, para evitar que la app quede colgada esperando indefinidamente
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log(`[JAVS] Conectado a MongoDB (base: ${mongoose.connection.name})`);
}
