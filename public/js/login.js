// Pantalla de ingreso: envía usuario y contraseña con fetch y, si son correctos, entra al inicio.
const form = document.querySelector("#login-form");
const mensaje = document.querySelector("#mensaje");
const btnIngresar = document.querySelector("#btn-ingresar");

function mostrarError(texto) {
  mensaje.className = "mensaje error";
  mensaje.textContent = texto;
  mensaje.hidden = false;
}

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensaje.hidden = true;
  btnIngresar.disabled = true;

  try {
    const respuesta = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
      mostrarError(datos.mensaje || "No se pudo iniciar sesión");
      form.elements.clave.value = "";
      form.elements.clave.focus();
      return;
    }

    location.assign("/");
  } catch (error) {
    console.error(error);
    mostrarError("No se pudo conectar con el servidor");
  } finally {
    btnIngresar.disabled = false;
  }
});

form.elements.usuario.focus();
