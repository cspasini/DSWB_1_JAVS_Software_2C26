// Lee una cookie del encabezado de la solicitud (Express no la interpreta por sí solo).
export function leerCookie(req, nombre) {
  const cabecera = req.headers.cookie;
  if (!cabecera) return undefined;

  for (const par of cabecera.split(";")) {
    const igual = par.indexOf("=");
    if (igual === -1) continue;
    if (par.slice(0, igual).trim() !== nombre) continue;

    try {
      return decodeURIComponent(par.slice(igual + 1).trim());
    } catch {
      return undefined; // valor mal codificado
    }
  }
  return undefined;
}
