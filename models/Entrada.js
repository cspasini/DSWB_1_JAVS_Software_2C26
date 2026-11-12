import mongoose from "mongoose";

export const CANALES = ["digital", "fisico"];
export const ESTADOS_ENTRADA = ["valida", "usada", "anulada"];

// Un documento por entrada: cada una tiene su propio código (el que irá en el QR).
const entradaSchema = new mongoose.Schema(
  {
    funcionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Funcion",
      required: true,
      index: true,
    },
    canal: { type: String, enum: CANALES, required: true },
    // Comprador: obligatorio en la venta digital. En la venta en puerta puede no haber cuenta.
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      index: true,
      required: [
        function () {
          return this.canal === "digital";
        },
        "El comprador es obligatorio en ventas digitales",
      ],
    },
    // Quién vendió la entrada en boletería física (admin o espacio).
    vendedorId: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" },
    codigo: { type: String, required: true, unique: true },
    estado: { type: String, enum: ESTADOS_ENTRADA, default: "valida" },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        delete ret._id;
        return ret;
      },
    },
  },
);

export default mongoose.model("Entrada", entradaSchema, "entradas");
