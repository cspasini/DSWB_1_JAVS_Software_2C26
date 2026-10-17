import mongoose from "mongoose";

export const ROLES = ["admin", "editor"];

const usuarioSchema = new mongoose.Schema(
  {
    usuario: {
      type: String,
      required: [true, "El usuario es obligatorio"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, "El usuario debe tener al menos 3 caracteres"],
      maxlength: [50, "El usuario no puede superar los 50 caracteres"],
      match: [
        /^[a-z0-9._-]+$/,
        "El usuario solo puede tener letras, números, punto, guion y guion bajo",
      ],
    },
    // Nunca se guarda la contraseña, solo su hash.
    // select: false evita que salga en las consultas por accidente (hay que pedirlo con .select('+claveHash')).
    claveHash: { type: String, required: true, select: false },
    rol: {
      type: String,
      enum: {
        values: ROLES,
        message: `Rol inválido. Valores permitidos: ${ROLES.join(", ")}`,
      },
      default: "editor",
    },
    activo: { type: Boolean, default: true }, // permite deshabilitar una cuenta sin borrarla
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.claveHash;
        return ret;
      },
    },
  },
);

export default mongoose.model("Usuario", usuarioSchema, "usuarios");
