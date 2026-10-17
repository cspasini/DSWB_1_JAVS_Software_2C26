import mongoose from "mongoose";

const sesionSchema = new mongoose.Schema(
  {
    // Se guarda el hash del identificador, no el identificador: si alguien leyera la base no podría usar las sesiones.
    tokenHash: { type: String, required: true, unique: true },
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
      index: true,
    },
    expiraEn: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// MongoDB borra solo las sesiones vencidas (revisa cada minuto aproximadamente).
sesionSchema.index({ expiraEn: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Sesion", sesionSchema, "sesiones");
