// 404 para cualquier ruta que no exista.
export function rutaNoEncontrada(req, res) {
  res
    .status(404)
    .json({ mensaje: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

// Manejador central de errores. Express 5 le reenvía automáticamente
// cualquier error lanzado dentro de un controlador async (no hace falta try/catch).
export function manejarErrores(err, _req, res, next) {
  if (res.headersSent) return next(err);

  if (err.name === "ValidationError") {
    const detalles = Object.values(err.errors).map((e) => e.message);
    return res
      .status(400)
      .json({ mensaje: "Los datos enviados no son válidos", detalles });
  }

  if (err.name === "CastError") {
    return res
      .status(400)
      .json({ mensaje: `Valor inválido para "${err.path}"` });
  }

  if (err.type === "entity.parse.failed") {
    return res
      .status(400)
      .json({ mensaje: "El cuerpo de la solicitud no es un JSON válido" });
  }

  if (err.type === "entity.too.large") {
    return res
      .status(413)
      .json({ mensaje: "El cuerpo de la solicitud es demasiado grande" });
  }

  console.error("[JAVS] Error no controlado:", err);
  res.status(500).json({ mensaje: "Error interno del servidor" });
}
