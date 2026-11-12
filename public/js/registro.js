// Registro de usuarios: la cuenta se crea siempre con rol "publico" (lo fuerza el servidor).
const form = document.querySelector("#registro-form");
const mensaje = document.querySelector("#mensaje");
const btnRegistrar = document.querySelector("#btn-registrar");

function mostrarError(texto) {
  mensaje.className = "mensaje error";
  mensaje.textContent = texto;
  mensaje.hidden = false;
}

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensaje.hidden = true;

  const { usuario, clave, repeticion } = Object.fromEntries(new FormData(form));
  if (clave !== repeticion) {
    return mostrarError("Las contraseñas no coinciden");
  }

  btnRegistrar.disabled = true;
  try {
    const respuesta = await fetch("/api/auth/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, clave }),
    });
    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
      return mostrarError(datos.mensaje || "No se pudo crear la cuenta");
    }
    // El registro ya deja la sesión iniciada: se entra directo al inicio.
    window.location.href = "/";
  } catch (error) {
    console.error(error);
    mostrarError("No se pudo conectar con el servidor");
  } finally {
    btnRegistrar.disabled = false;
  }
});
