// Front de la cartelera: crea, edita y elimina travesías usando fetch contra /api/travesias.
// Todo el texto del servidor se inserta con textContent/append (nunca innerHTML), para evitar XSS.

const API = "/api/travesias";
const CAMPOS = [
  "artista",
  "nombreTour",
  "origen",
  "destino",
  "aforoTotal",
  "estado",
];

const form = document.querySelector("#gira-form");
const formTitulo = document.querySelector("#form-titulo");
const lista = document.querySelector("#lista-giras");
const mensaje = document.querySelector("#mensaje");
const btnGuardar = document.querySelector("#btn-guardar");
const btnCancelar = document.querySelector("#btn-cancelar");

let idEnEdicion = null; // null = creando una travesía nueva; string = editando esa
let temporizadorMensaje;

/* ---------- Capa de acceso a la API (fetch) ---------- */

async function pedir(url, opciones = {}) {
  const respuesta = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opciones,
  });

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

function crearTarjeta(gira) {
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

  const aforo = el("p");
  aforo.append(
    "👥 ",
    el("strong", "", "Aforo Sincronizado:"),
    ` ${gira.aforoTotal} localidades disponibles (Inventario Único)`,
  );

  const info = el("div", "info");
  info.append(ruta, aforo);

  const btnEditar = el("button", "btn", "Editar");
  btnEditar.type = "button";
  btnEditar.dataset.accion = "editar";

  const btnEliminar = el("button", "btn btn-peligro", "Eliminar");
  btnEliminar.type = "button";
  btnEliminar.dataset.accion = "eliminar";

  const acciones = el("div", "acciones");
  acciones.append(btnEditar, btnEliminar);

  tarjeta.append(
    titulo,
    el("p", "tour", `Tour: ${gira.nombreTour}`),
    info,
    acciones,
  );
  return tarjeta;
}

async function cargarGiras() {
  const giras = await api.listar();

  if (giras.length === 0) {
    lista.replaceChildren(
      el("p", "vacio", "Todavía no hay travesías publicadas."),
    );
  } else {
    lista.replaceChildren(...giras.map(crearTarjeta));
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

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const datos = Object.fromEntries(new FormData(form));
  datos.aforoTotal = Number(datos.aforoTotal);

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

btnCancelar.addEventListener("click", salirDeEdicion);

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
