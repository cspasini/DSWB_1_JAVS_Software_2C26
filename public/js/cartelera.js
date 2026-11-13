// Front de la cartelera: crea, edita y elimina travesías usando fetch contra /api/travesias
// y muestra las próximas funciones (día, horario, sala y aforo) de cada una.
// Todo el texto del servidor se inserta con textContent/append (nunca innerHTML), para evitar XSS.

const API = "/api/travesias";
const CAMPOS = ["artista", "nombreTour", "origen", "destino", "estado"];

// Si el usuario no puede editar, el formulario no existe en la página (la vista no lo dibuja).
const form = document.querySelector("#gira-form");
const formTitulo = document.querySelector("#form-titulo");
const lista = document.querySelector("#lista-giras");
const mensaje = document.querySelector("#mensaje");
const btnGuardar = document.querySelector("#btn-guardar");
const btnCancelar = document.querySelector("#btn-cancelar");
const puedeEditar = document.body.dataset.puedeEditar === "true";

const formatoDia = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const formatoHora = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

let idEnEdicion = null; // null = creando una travesía nueva; string = editando esa
let temporizadorMensaje;

/* ---------- Capa de acceso a la API (fetch) ---------- */

async function pedir(url, opciones = {}) {
  const respuesta = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opciones,
  });

  // El JWT dura 1 hora: si venció, se vuelve al ingreso.
  if (respuesta.status === 401) {
    window.location.href = "/login";
    throw new Error("Sesión vencida");
  }

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    const error = new Error(datos.mensaje || "Ocurrió un error inesperado");
    error.status = respuesta.status;
    error.detalles = datos.detalles ?? [];
    throw error;
  }
  return datos;
}

const api = {
  listar: () => pedir(API),
  obtener: (id) => pedir(`${API}/${id}`),
  crear: (datos) => pedir(API, { method: "POST", body: JSON.stringify(datos) }),
  actualizar: (id, datos) =>
    pedir(`${API}/${id}`, { method: "PUT", body: JSON.stringify(datos) }),
  eliminar: (id) => pedir(`${API}/${id}`, { method: "DELETE" }),
  funciones: () => pedir("/api/funciones"),
};

/* ---------- Mensajes ---------- */

function mostrarMensaje(texto, tipo = "ok", detalles = []) {
  clearTimeout(temporizadorMensaje);
  mensaje.className = `mensaje ${tipo}`;
  mensaje.replaceChildren(texto);

  if (detalles.length > 0) {
    const ul = document.createElement("ul");
    for (const detalle of detalles) {
      const li = document.createElement("li");
      li.textContent = detalle;
      ul.append(li);
    }
    mensaje.append(ul);
  }

  mensaje.hidden = false;
  if (tipo === "ok") {
    temporizadorMensaje = setTimeout(() => (mensaje.hidden = true), 4000);
  }
}

function mostrarError(error) {
  console.error(error);
  // Sin status = el fetch ni siquiera llegó al servidor
  const texto =
    error.status === undefined
      ? "No se pudo conectar con el servidor"
      : error.message;
  mostrarMensaje(texto, "error", error.detalles ?? []);
}

/* ---------- Render de la lista ---------- */

function el(etiqueta, clase, texto) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

// Pinta los lugares de una función (la usan la carga inicial y el WebSocket).
function pintarAforo(fila, disponibles, aforo) {
  const nodo = fila.querySelector(".funcion-aforo");
  const cancelada = fila.dataset.estado === "Cancelada";

  fila.classList.toggle("cancelada", cancelada);
  fila.classList.toggle("agotada", !cancelada && disponibles <= 0);

  if (cancelada) nodo.textContent = "Función cancelada";
  else if (disponibles <= 0) nodo.textContent = `🎟️ Agotada (aforo ${aforo})`;
  else
    nodo.textContent = `🎟️ ${disponibles} de ${aforo} localidades disponibles`;
}

function crearFuncion(funcion) {
  const fecha = new Date(funcion.fecha);

  const fila = el("li", "funcion");
  fila.dataset.id = funcion.id;
  fila.dataset.estado = funcion.estado;

  const cuando = el("p", "funcion-cuando");
  cuando.append(
    el("strong", "", formatoDia.format(fecha)),
    ` · ${formatoHora.format(fecha)} hs`,
  );

  fila.append(
    cuando,
    el("p", "funcion-donde", `📍 ${funcion.ciudad} · ${funcion.sala}`),
    el("p", "funcion-aforo"),
  );
  pintarAforo(fila, funcion.disponibles, funcion.aforo);
  return fila;
}

function crearTarjeta(gira, funciones) {
  const tarjeta = el("article", "card");
  tarjeta.dataset.id = gira.id;

  const titulo = el("h2", "card-titulo", `${gira.artista} — `);
  titulo.append(el("span", `badge ${gira.estado.toLowerCase()}`, gira.estado));

  const ruta = el("p");
  ruta.append(
    "📍 ",
    el("strong", "", "Ruta de Circulación:"),
    ` Nodal ${gira.origen} ➔ Nodal ${gira.destino} (Eje Dual)`,
  );

  const info = el("div", "info");
  info.append(ruta);

  const listaFunciones = el("ul", "funciones");
  if (funciones.length === 0) {
    listaFunciones.append(
      el(
        "li",
        "vacio",
        "Todavía no hay funciones programadas para esta travesía.",
      ),
    );
  } else {
    listaFunciones.append(...funciones.map(crearFuncion));
  }

  const comprar = el("a", "btn", "Comprar entradas");
  comprar.href = "/boleteria";

  const acciones = el("div", "acciones");
  acciones.append(comprar);

  // Los botones de edición solo se muestran a quienes pueden editar (el servidor igual lo exige).
  if (puedeEditar) {
    const btnEditar = el("button", "btn", "Editar");
    btnEditar.type = "button";
    btnEditar.dataset.accion = "editar";

    const btnEliminar = el("button", "btn btn-peligro", "Eliminar");
    btnEliminar.type = "button";
    btnEliminar.dataset.accion = "eliminar";

    acciones.append(btnEditar, btnEliminar);
  }

  tarjeta.append(
    titulo,
    el("p", "tour", `Tour: ${gira.nombreTour}`),
    info,
    el("h3", "funciones-titulo", "Funciones"),
    listaFunciones,
    acciones,
  );
  return tarjeta;
}

async function cargarGiras() {
  const [giras, funciones] = await Promise.all([api.listar(), api.funciones()]);

  // Se agrupan las funciones por gira y se muestran solo las próximas (ya vienen ordenadas por fecha).
  const ahora = Date.now();
  const porGira = new Map();
  for (const funcion of funciones) {
    if (new Date(funcion.fecha).getTime() <= ahora) continue;
    if (!porGira.has(funcion.giraId)) porGira.set(funcion.giraId, []);
    porGira.get(funcion.giraId).push(funcion);
  }

  if (giras.length === 0) {
    lista.replaceChildren(
      el("p", "vacio", "Todavía no hay travesías publicadas."),
    );
  } else {
    lista.replaceChildren(
      ...giras.map((gira) => crearTarjeta(gira, porGira.get(gira.id) ?? [])),
    );
  }
}

/* ---------- Modo edición del formulario ---------- */

function entrarEnEdicion(gira) {
  idEnEdicion = gira.id;
  for (const campo of CAMPOS) form.elements[campo].value = gira[campo];

  formTitulo.textContent = `Editando: ${gira.artista}`;
  btnGuardar.textContent = "Guardar cambios";
  btnCancelar.hidden = false;

  form.scrollIntoView({ behavior: "smooth", block: "start" });
  form.elements.artista.focus();
}

function salirDeEdicion() {
  idEnEdicion = null;
  form.reset();
  formTitulo.textContent = "Nueva travesía";
  btnGuardar.textContent = "Publicar travesía";
  btnCancelar.hidden = true;
}

/* ---------- Eventos ---------- */

// El "?." evita errores cuando el formulario no existe (usuarios sin permiso de edición).
form?.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const datos = Object.fromEntries(new FormData(form));

  btnGuardar.disabled = true;
  try {
    const { mensaje: texto } = idEnEdicion
      ? await api.actualizar(idEnEdicion, datos)
      : await api.crear(datos);

    salirDeEdicion();
    await cargarGiras();
    mostrarMensaje(texto);
  } catch (error) {
    mostrarError(error);
  } finally {
    btnGuardar.disabled = false;
  }
});

btnCancelar?.addEventListener("click", salirDeEdicion);

// Un solo listener para todos los botones de la lista (delegación de eventos)
lista.addEventListener("click", async (evento) => {
  const boton = evento.target.closest("button[data-accion]");
  if (!boton) return;

  const { id } = boton.closest(".card").dataset;

  try {
    if (boton.dataset.accion === "editar") {
      // Se pide la gira al servidor para editar siempre sobre datos actuales
      entrarEnEdicion(await api.obtener(id));
    }

    if (boton.dataset.accion === "eliminar") {
      if (!confirm("¿Eliminar esta travesía de la cartelera?")) return;

      const { mensaje: texto } = await api.eliminar(id);
      if (id === idEnEdicion) salirDeEdicion();
      await cargarGiras();
      mostrarMensaje(texto);
    }
  } catch (error) {
    mostrarError(error);
    // Si la gira ya no existe (la borró otra persona), se refresca la lista
    if (error.status === 404) cargarGiras().catch(console.error);
  }
});

/* ---------- Tiempo real (Socket.IO) ---------- */

if (typeof io !== "undefined") {
  const socket = io();

  // Se creó, editó o eliminó una gira o una función: se recarga la lista.
  socket.on("cartelera:cambio", () => cargarGiras().catch(console.error));

  // Alguien compró o vendió: cambian los lugares de esa función sin recargar.
  socket.on("aforo:actualizado", ({ funcionId, disponibles, aforo }) => {
    const fila = lista.querySelector(
      `.funcion[data-id="${CSS.escape(funcionId)}"]`,
    );
    if (fila) pintarAforo(fila, disponibles, aforo);
  });

  socket.on("connect_error", (error) => {
    if (error.message === "No autenticado") window.location.href = "/login";
  });
}

// Carga inicial: reemplaza el primer pintado del servidor por la versión con funciones.
cargarGiras().catch(mostrarError);
