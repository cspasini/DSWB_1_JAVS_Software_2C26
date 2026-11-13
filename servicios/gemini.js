import { GoogleGenAI } from "@google/genai";
import Gira from "../models/Gira.js";
import Funcion from "../models/Funcion.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const PROMPT_BASE = `Sos el Asistente de Urbana Cult, una plataforma de circulación cultural independiente.
- Respondé siempre en español rioplatense, con tono cordial, formal y empático.
- Ayudás con cartelera, giras, funciones y cómo comprar entradas.
- Usá SOLO la información del contexto. Si no la tenés, decilo y sugerí consultar al espacio.
- No prometas precios, descuentos ni disponibilidad: la disponibilidad real se confirma al comprar.
- Respuestas breves, de hasta 500 caracteres.`;

export async function consultarIA(pregunta, giraId) {
  const gira = await Gira.findById(giraId).lean();
  const funciones = await Funcion.find({ giraId }).lean();
  const contexto = JSON.stringify({ gira, funciones });

  const res = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite", // verificá el modelo vigente en la documentación de Gemini
    contents: pregunta || "Hola",
    config: {
      systemInstruction: `${PROMPT_BASE}\n\nContexto de la gira:\n${contexto}`,
    },
  });
  return res.text;
}
