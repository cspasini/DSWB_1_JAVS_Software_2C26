// Botón "Cerrar sesión" de las páginas internas.
const boton = document.querySelector("#btn-salir");

boton?.addEventListener("click", async () => {
  boton.disabled = true;

  try {
    const respuesta = await fetch("/api/auth/logout", { method: "POST" });
    if (!respuesta.ok) throw new Error(`Respuesta ${respuesta.status}`);
    location.assign("/login");
  } catch (error) {
    console.error(error);
    boton.disabled = false;
    alert("No se pudo cerrar la sesión. Intente nuevamente.");
  }
});
