import mongoose from "mongoose";

export const ESTADOS_FUNCION = ["Programada", "Cancelada"];

const textoObligatorio = (etiqueta) => ({
  type: String,
  required: [true, `${etiqueta} es obligatoria`],
  trim: true,
  maxlength: [100, `${etiqueta} no puede superar los 100 caracteres`],
});

// Ventana de ingreso por defecto, en minutos respecto del inicio. Cada función puede definir la suya.
export const VENTANA_INGRESO_DEFECTO = {
  aperturaAntesMin: 120, // las puertas abren 2 h antes
  cierreDespuesMin: 180, // el ingreso cierra 3 h después del inicio
};

const minutosEnteros = () => ({
  validator: Number.isInteger,
  message: "Debe ser un número entero de minutos",
});

// Una función es una fecha concreta de una gira en una sala. Acá vive el inventario único:
// disponibles = aforo - vendidas, sin importar si la venta fue digital o en boletería física.
const funcionSchema = new mongoose.Schema(
  {
    giraId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gira",
      required: [true, "La travesía es obligatoria"],
      index: true,
    },
    ciudad: textoObligatorio("La ciudad"),
    sala: textoObligatorio("La sala"),
    fecha: {
      type: Date,
      required: [true, "La fecha es obligatoria"],
      cast: "La fecha no es válida",
      validate: {
        validator: (valor) => valor > new Date(),
        message: "La fecha de la función debe ser futura",
      },
    },
    aforo: {
      type: Number,
      required: [true, "El aforo es obligatorio"],
      min: [1, "El aforo debe ser al menos 1"],
      cast: "El aforo debe ser un número",
      validate: {
        validator: Number.isInteger,
        message: "El aforo debe ser un número entero",
      },
    },
    // Solo se modifica con operaciones atómicas ($inc) desde servicios/boleteria.js, nunca desde el body.
    vendidas: { type: Number, default: 0, min: 0 },
    estado: {
      type: String,
      enum: {
        values: ESTADOS_FUNCION,
        message: `Estado inválido. Valores permitidos: ${ESTADOS_FUNCION.join(", ")}`,
      },
      default: "Programada",
    },
    // Ventana en la que se pueden validar entradas en puerta (se elige al crear la función).
    aperturaAntesMin: {
      type: Number,
      default: VENTANA_INGRESO_DEFECTO.aperturaAntesMin,
      min: [0, "Las puertas no pueden abrir después del inicio"],
      max: [
        720,
        "Las puertas no pueden abrir con más de 12 horas de anticipación",
      ],
      cast: "Los minutos de apertura deben ser un número",
      validate: minutosEnteros(),
    },
    cierreDespuesMin: {
      type: Number,
      default: VENTANA_INGRESO_DEFECTO.cierreDespuesMin,
      min: [
        15,
        "El ingreso debe seguir abierto al menos 15 minutos después del inicio",
      ],
      max: [
        1440,
        "El ingreso no puede cerrar más de 24 horas después del inicio",
      ],
      cast: "Los minutos de cierre deben ser un número",
      validate: minutosEnteros(),
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true, // expone "id" y "disponibles"
      versionKey: false,
      transform: (_doc, ret) => {
        delete ret._id;
        return ret;
      },
    },
  },
);

funcionSchema.virtual("disponibles").get(function () {
  return this.aforo - this.vendidas;
});

export default mongoose.model("Funcion", funcionSchema, "funciones");
