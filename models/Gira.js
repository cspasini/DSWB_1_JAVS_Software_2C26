import mongoose from "mongoose";

export const ESTADOS = ["Confirmada", "Pendiente", "Reprogramada", "Cancelada"];

const textoObligatorio = (etiqueta) => ({
  type: String,
  required: [true, `${etiqueta} es obligatorio`],
  trim: true,
  maxlength: [100, `${etiqueta} no puede superar los 100 caracteres`],
});

const giraSchema = new mongoose.Schema(
  {
    artista: textoObligatorio("El artista"),
    nombreTour: textoObligatorio("El nombre del tour"),
    origen: textoObligatorio("El origen"),
    destino: textoObligatorio("El destino"),
    aforoTotal: {
      type: Number,
      required: [true, "El aforo total es obligatorio"],
      min: [1, "El aforo total debe ser al menos 1"],
      cast: "El aforo total debe ser un número",
      validate: {
        validator: Number.isInteger,
        message: "El aforo total debe ser un número entero",
      },
    },
    estado: {
      type: String,
      enum: {
        values: ESTADOS,
        message: `Estado inválido. Valores permitidos: ${ESTADOS.join(", ")}`,
      },
      default: "Confirmada", // Estado por defecto según el flujo del informe
    },
  },
  {
    timestamps: true, // createdAt / updatedAt
    toJSON: {
      virtuals: true, // expone "id" (string) ademas de _id
      versionKey: false,
      transform: (_doc, ret) => {
        delete ret._id;
        return ret;
      },
    },
  },
);

// Cada instancia (new Gira({...})) es un objeto del modelo; Mongoose aporta
// los métodos de persistencia: save(), find(), findByIdAndUpdate(), etc.
export default mongoose.model("Gira", giraSchema);
