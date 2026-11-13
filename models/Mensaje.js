import mongoose from "mongoose";

const mensajeSchema = new mongoose.Schema(
  {
    giraId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gira",
      required: true,
      index: true,
    },
    usuario: { type: String, required: true },
    texto: { type: String, required: true, maxlength: 500 },
    esIA: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model("Mensaje", mensajeSchema);
