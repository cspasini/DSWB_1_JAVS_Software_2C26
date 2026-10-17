import readline from "node:readline";
import { Writable } from "node:stream";

// Pregunta por consola sin mostrar lo que se escribe (para contraseñas).
export function preguntarOculto(pregunta) {
  return new Promise((resolve) => {
    let silenciado = false;

    const salida = new Writable({
      write(fragmento, _codificacion, listo) {
        if (!silenciado) process.stdout.write(fragmento);
        listo();
      },
    });

    const rl = readline.createInterface({
      input: process.stdin,
      output: salida,
      terminal: true,
    });

    rl.question(pregunta, (respuesta) => {
      rl.close();
      process.stdout.write("\n");
      resolve(respuesta);
    });

    silenciado = true; // la pregunta ya se mostró; lo que se escriba a partir de acá no
  });
}
