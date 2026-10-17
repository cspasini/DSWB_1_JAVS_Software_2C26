// Campos que el cliente puede enviar. Todo lo demás se descarta
// (evita que alguien inyecte createdAt, _id u otros campos por el body).
const CAMPOS_PERMITIDOS = [
  "artista",
  "nombreTour",
  "origen",
  "destino",
  "aforoTotal",
  "estado",
];

// Deja en req.datosGira solo los campos permitidos.
// Las reglas de validación (obligatorios, rangos, enum) viven en el esquema del modelo.
export function filtrarCamposGira(req, _res, next) {
  const body = req.body ?? {}; // en Express 5, req.body es undefined si no llegó JSON
  const datos = {};

  for (const campo of CAMPOS_PERMITIDOS) {
    if (body[campo] !== undefined) datos[campo] = body[campo];
  }

  req.datosGira = datos;
  next();
}
