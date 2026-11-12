// Administración de roles: lista los usuarios y cambia el rol con PATCH /api/usuarios/:id/rol.
// Todo el texto del servidor se inserta con textContent (nunca innerHTML), para evitar XSS.

// Debe coincidir con utils/roles.js del servidor (el servidor valida igual).
const ROLES = ["publico", "artista", "espacio", "admin"];

const tabla = document.querySelector(".tabla-usuarios");
const cuerpo = document.querySelector("#cuerpo-usuarios");
const mensaje = document.querySelector("#mensaje");
const miId = tabla.dataset.miId;

let temporizadorMensaje;

function mostrarMensaje(texto, tipo = "ok") {
  clearTimeout(temporizadorMensaje);
  mensaje.className = `mensaje ${tipo}`;
  mensaje.textContent = texto;
  mensaje.hidden = false;
  if (tipo === "ok") {
    temporizadorMensaje = setTimeout(() => (mensaje.hidden = true), 4000);
  }
}

async function pedir(url, opciones = {}) {
  const respuesta = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opciones,
  });
  if (respuesta.status === 401) {
    window.location.href = "/login"; // sesión vencida
    throw new Error("Sesión vencida");
  }
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new Error(datos.mensaje || "Ocurrió un error inesperado");
  }
  return datos;
}

function celda(texto) {
  const td = document.createElement("td");
  td.textContent = texto;
  return td;
}

function crearSelector(usuario) {
  const select = document.createElement("select");
  select.className = "selector-rol";
  select.setAttribute("aria-label", `Rol de ${usuario.usuario}`);
  for (const rol of ROLES) {
    const opcion = document.createElement("option");
    opcion.value = rol;
    opcion.textContent = rol;
    select.append(opcion);
  }
  select.value = usuario.rol;
  select.dataset.rolActual = usuario.rol;

  // Un admin no puede cambiar su propio rol (el servidor también lo impide).
  if (usuario._id === miId) {
    select.disabled = true;
    select.title = "No podés cambiar tu propio rol";
  }
  return select;
}

function crearFila(usuario) {
  const fila = document.createElement("tr");
  fila.dataset.id = usuario._id;

  const tdRol = document.createElement("td");
  tdRol.append(crearSelector(usuario));

  const tdEstado = document.createElement("td");
  const estado = document.createElement("span");
  estado.className = `badge ${usuario.activo ? "activa" : "inactiva"}`;
  estado.textContent = usuario.activo ? "Activa" : "Deshabilitada";
  tdEstado.append(estado);

  const nombre = celda(
    usuario._id === miId ? `${usuario.usuario} (vos)` : usuario.usuario,
  );
  const alta = celda(new Date(usuario.createdAt).toLocaleDateString("es-AR"));

  fila.append(nombre, tdRol, tdEstado, alta);
  return fila;
}

async function cargarUsuarios() {
  const usuarios = await pedir("/api/usuarios");
  cuerpo.replaceChildren(...usuarios.map(crearFila));
}

// Un solo listener para todos los selectores (delegación de eventos)
cuerpo.addEventListener("change", async (evento) => {
  const select = evento.target.closest("select.selector-rol");
  if (!select) return;

  const { id } = select.closest("tr").dataset;
  const rolAnterior = select.dataset.rolActual;
  const rolNuevo = select.value;

  select.disabled = true;
  try {
    const { mensaje: texto } = await pedir(`/api/usuarios/${id}/rol`, {
      method: "PATCH",
      body: JSON.stringify({ rol: rolNuevo }),
    });
    select.dataset.rolActual = rolNuevo;
    mostrarMensaje(texto);
  } catch (error) {
    select.value = rolAnterior; // se vuelve al valor anterior si falló
    mostrarMensaje(error.message, "error");
  } finally {
    select.disabled = false;
  }
});

cargarUsuarios().catch((error) => mostrarMensaje(error.message, "error"));
