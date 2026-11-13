// Front del chat por travesía. El WebSocket solo recibe mensajes; enviar va por la API REST.
// Todo texto del servidor se inserta con textContent (nunca innerHTML) para evitar XSS.

const selectGira = document.querySelector("#select-gira");
const contenedor = document.querySelector("#mensajes");
const formulario = document.querySelector("#chat-form");
const campoTexto = document.querySelector("#chat-texto");
const botonEnviar = document.querySelector("#btn-enviar");
const mensaje = document.querySelector("#mensaje");
const estadoConexion = document.querySelector("#estado-conexion");

const formatoHora = new Intl.DateTimeFormat("es-AR", { timeStyle: "short" });

let giraActual = "";
let socket = null;
let temporizadorMensaje;
const mostrados = new Set(); // ids ya dibujados: evita duplicar el eco del WebSocket

async function pedir(url, opciones = {}) {
  const respuesta = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opciones,
  });
  if (respuesta.status === 401) {
    window.location.href = "/login";
    throw new Error("Sesión vencida");
  }
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const error = new Error(datos.mensaje || "Ocurrió un error inesperado");
    error.status = respuesta.status;
    throw error;
  }
  return datos;
}

function mostrarMensaje(texto, tipo = "ok") {
  clearTimeout(temporizadorMensaje);
  mensaje.className = `mensaje ${tipo}`;
  mensaje.textContent = texto;
  mensaje.hidden = false;
  if (tipo === "ok") {
    temporizadorMensaje = setTimeout(() => (mensaje.hidden = true), 4000);
  }
}

function mostrarError(error) {
  console.error(error);
  mostrarMensaje(
    error.status === undefined
      ? "No se pudo conectar con el servidor"
      : error.message,
    "error",
  );
}

function el(etiqueta, clase, texto) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

const miUsuario = document
  .querySelector(".sesion span")
  ?.textContent.replace("Sesión: ", "");

function agregarMensaje(msg) {
  if (mostrados.has(msg._id)) return;
  mostrados.add(msg._id);

  const burbuja = el("article", "burbuja");
  if (msg.esIA) burbuja.classList.add("ia");
  else if (msg.usuario === miUsuario) burbuja.classList.add("propia");

  burbuja.append(
    el("span", "autor", msg.esIA ? "🤖 Asistente IA" : msg.usuario),
    el("span", "", msg.texto),
    el("span", "hora", formatoHora.format(new Date(msg.createdAt))),
  );

  contenedor.querySelector(".vacio")?.remove();
  contenedor.append(burbuja);
  contenedor.scrollTop = contenedor.scrollHeight;
}

function habilitarEscritura(habilitado) {
  campoTexto.disabled = !habilitado;
  botonEnviar.disabled = !habilitado;
}

async function cambiarGira(giraId) {
  if (giraActual) socket?.emit("chat:salir", giraActual);
  giraActual = giraId;
  mostrados.clear();
  habilitarEscritura(false);

  if (!giraId) {
    contenedor.replaceChildren(
      el("p", "vacio", "Elegí una travesía para ver la conversación."),
    );
    return;
  }

  socket?.emit("chat:unirse", giraId);
  const mensajes = await pedir(`/api/chat/${encodeURIComponent(giraId)}`);
  contenedor.replaceChildren();
  if (mensajes.length === 0) {
    contenedor.append(
      el("p", "vacio", "Todavía no hay mensajes. ¡Escribí el primero!"),
    );
  }
  mensajes.forEach(agregarMensaje);
  habilitarEscritura(true);
}

async function cargarGiras() {
  const giras = await pedir("/api/travesias");
  for (const gira of giras) {
    const opcion = el("option", "", `${gira.artista} — ${gira.nombreTour}`);
    opcion.value = gira.id;
    selectGira.append(opcion);
  }
}

selectGira.addEventListener("change", () =>
  cambiarGira(selectGira.value).catch(mostrarError),
);

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const texto = campoTexto.value.trim();
  if (!texto || !giraActual) return;

  botonEnviar.disabled = true;
  try {
    const msg = await pedir("/api/chat", {
      method: "POST",
      body: JSON.stringify({ giraId: giraActual, texto }),
    });
    campoTexto.value = "";
    agregarMensaje(msg); // si el socket ya lo dibujó, se ignora por id
  } catch (error) {
    mostrarError(error);
  } finally {
    botonEnviar.disabled = false;
    campoTexto.focus();
  }
});

/* ---------- Tiempo real (Socket.IO) ---------- */

function marcarConexion(conectado) {
  estadoConexion.className = `estado-conexion ${conectado ? "en-vivo" : "desconectado"}`;
  estadoConexion.textContent = conectado ? "● En vivo" : "Sin conexión en vivo";
}

function iniciarTiempoReal() {
  if (typeof io === "undefined") return marcarConexion(false);

  socket = io(); // la cookie de sesión identifica al usuario

  socket.on("connect", () => {
    marcarConexion(true);
    if (giraActual) socket.emit("chat:unirse", giraActual); // reingreso tras reconectar
  });
  socket.on("disconnect", (motivo) => {
    marcarConexion(false);
    if (motivo === "io server disconnect") window.location.href = "/login";
  });
  socket.on("connect_error", (error) => {
    marcarConexion(false);
    if (error.message === "No autenticado") window.location.href = "/login";
  });

  socket.on("chat:mensaje", (msg) => {
    if (msg.giraId === giraActual) agregarMensaje(msg);
  });
}

iniciarTiempoReal();
cargarGiras().catch(mostrarError);
