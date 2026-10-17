import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Todo el manejo de contraseñas vive en este archivo.

const scryptAsync = promisify(scrypt);

// Parámetros actuales de scrypt (costo de CPU y memoria). Cada hash guarda los suyos,
// así se pueden subir más adelante sin invalidar las contraseñas ya guardadas.
const PARAMETROS = { N: 2 ** 15, r: 8, p: 3 };
const LARGO_HASH = 64;

function derivar(clave, sal, { N, r, p }, largo) {
  const memoria = 128 * r * (N + p + 2); // lo que necesita scrypt; se deja el doble de margen
  // Normalizar evita que una misma contraseña escrita con otra codificación Unicode no coincida
  return scryptAsync(clave.normalize("NFKC"), sal, largo, {
    N,
    r,
    p,
    maxmem: memoria * 2,
  });
}

// Devuelve un texto "scrypt$N$r$p$sal$hash" listo para guardar en la base.
export async function hashearClave(clave) {
  const sal = randomBytes(16);
  const hash = await derivar(clave, sal, PARAMETROS, LARGO_HASH);
  const { N, r, p } = PARAMETROS;
  return [
    "scrypt",
    N,
    r,
    p,
    sal.toString("base64url"),
    hash.toString("base64url"),
  ].join("$");
}

// Compara una contraseña con un hash guardado. Nunca lanza error: ante cualquier problema devuelve false.
export async function verificarClave(clave, almacenado) {
  const partes = String(almacenado).split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") return false;

  const [, N, r, p, sal, hash] = partes;
  const parametros = { N: Number(N), r: Number(r), p: Number(p) };
  if (!Object.values(parametros).every((n) => Number.isSafeInteger(n) && n > 0))
    return false;

  const esperado = Buffer.from(hash, "base64url");
  if (esperado.length === 0) return false;

  try {
    const obtenido = await derivar(
      clave,
      Buffer.from(sal, "base64url"),
      parametros,
      esperado.length,
    );
    return timingSafeEqual(obtenido, esperado); // comparación en tiempo constante
  } catch {
    return false;
  }
}

// true si el hash se hizo con parámetros más débiles que los actuales (conviene regenerarlo al ingresar).
export function necesitaRehash(almacenado) {
  const [algoritmo, N, r, p] = String(almacenado).split("$");
  return (
    algoritmo !== "scrypt" ||
    Number(N) !== PARAMETROS.N ||
    Number(r) !== PARAMETROS.r ||
    Number(p) !== PARAMETROS.p
  );
}

// Reglas para contraseñas nuevas. Devuelve el motivo del rechazo, o null si es válida.
export function validarClaveNueva(clave) {
  if (typeof clave !== "string" || clave.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres";
  }
  if (clave.length > 128)
    return "La contraseña no puede superar los 128 caracteres";
  return null;
}
