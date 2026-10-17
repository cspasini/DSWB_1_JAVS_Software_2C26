// Freno básico contra adivinar contraseñas: tras MAX_FALLOS intentos fallidos seguidos
// se bloquea esa combinación (IP + usuario) hasta que pase la ventana de tiempo.
// Vive en memoria: se reinicia con el servidor y no sirve con varias instancias.

const MAX_FALLOS = 5;
const VENTANA_MS = 15 * 60 * 1000; // 15 minutos
const MAX_REGISTROS = 5000; // evita que el mapa crezca sin límite

const intentos = new Map(); // clave -> { fallos, desde }

function limpiarVencidos(ahora) {
  for (const [clave, registro] of intentos) {
    if (ahora - registro.desde > VENTANA_MS) intentos.delete(clave);
  }
}

export function estaBloqueado(clave, ahora = Date.now()) {
  const registro = intentos.get(clave);
  if (!registro) return false;
  if (ahora - registro.desde > VENTANA_MS) {
    intentos.delete(clave);
    return false;
  }
  return registro.fallos >= MAX_FALLOS;
}

export function registrarFallo(clave, ahora = Date.now()) {
  const registro = intentos.get(clave);
  if (!registro || ahora - registro.desde > VENTANA_MS) {
    intentos.set(clave, { fallos: 1, desde: ahora });
  } else {
    registro.fallos += 1;
  }
  if (intentos.size > MAX_REGISTROS) limpiarVencidos(ahora);
}

export function limpiarFallos(clave) {
  intentos.delete(clave);
}
