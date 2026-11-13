// Front de la boletería: compra digital, venta en puerta (personal), mis entradas y aforo en vivo.
// Todo el texto del servidor se inserta con textContent/append (nunca innerHTML), para evitar XSS.

const MAX_POR_COMPRA = 6; // debe coincidir con servicios/boleteria.js (el servidor valida igual)

const esPersonal = document.body.dataset.esPersonal === "true";

const listaFunciones = document.querySelector("#lista-funciones");
const listaEntradas = document.querySelector("#lista-entradas");
const mensaje = document.querySelector("#mensaje");
const estadoConexion = document.querySelector("#estado-conexion");
const formFuncion = document.querySelector("#funcion-form"); // solo existe para admin y espacio
const selectGira = document.querySelector("#select-gira");

const formatoFecha = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "full",
  timeStyle: "short",
});

let giras = [];
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

/* ---------- Helpers de DOM ---------- */

function el(etiqueta, clase, texto) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

const nombreGira = (gira) =>
  gira ? `${gira.artista} — ${gira.nombreTour}` : "Travesía";

/* ---------- Funciones a la venta ---------- */

function crearTarjeta(funcion) {
  const gira = giras.find((g) => g.id === funcion.giraId);

  const tarjeta = el("article", "card");
  tarjeta.dataset.id = funcion.id;

  const titulo = el("h2", "card-titulo", `${nombreGira(gira)} `);
  titulo.append(el("span", "etiqueta-agotada", "Agotada"));

  const lugar = el("p", "", `📍 ${funcion.ciudad} · ${funcion.sala}`);
  const fecha = el(
    "p",
    "",
    `🗓️ ${formatoFecha.format(new Date(funcion.fecha))}`,
  );

  const disponibilidad = el("p", "disponibilidad");
  disponibilidad.append(
    "🎟️ ",
    el("strong", "", "Disponibles: "),
    el("span", "num-disponibles", ""),
    " de ",
    el("span", "num-aforo", String(funcion.aforo)),
  );

  const cantidad = document.createElement("input");
  cantidad.type = "number";
  cantidad.name = "cantidad";
  cantidad.min = "1";
  cantidad.max = String(MAX_POR_COMPRA);
  cantidad.value = "1";
  cantidad.step = "1";

  const etiquetaCantidad = el("label", "", "Cantidad");
  etiquetaCantidad.append(cantidad);

  const btnComprar = el("button", "btn btn-principal", "Comprar");
  btnComprar.type = "button";
  btnComprar.dataset.accion = "comprar";

  const compra = el("div", "compra");
  compra.append(etiquetaCantidad, btnComprar);

  // La venta en puerta solo se ofrece al personal (el servidor igual lo exige).
  if (esPersonal) {
    const btnPuerta = el("button", "btn", "Vender en puerta");
    btnPuerta.type = "button";
    btnPuerta.dataset.accion = "fisica";
    compra.append(btnPuerta);
  }

  tarjeta.append(titulo, lugar, fecha, disponibilidad, compra);
  actualizarDisponibilidad(tarjeta, funcion.disponibles);
  return tarjeta;
}

// Refleja en la tarjeta los lugares que quedan (la usan la carga inicial, la compra y el WebSocket).
function actualizarDisponibilidad(tarjeta, disponibles, aforo) {
  tarjeta.querySelector(".num-disponibles").textContent = String(disponibles);
  if (aforo !== undefined) {
    tarjeta.querySelector(".num-aforo").textContent = String(aforo);
  }

  const agotada = disponibles <= 0;
  tarjeta.classList.toggle("agotada", agotada);
  tarjeta.querySelector(".etiqueta-agotada").hidden = !agotada;

  for (const boton of tarjeta.querySelectorAll("button[data-accion]")) {
    boton.disabled = agotada;
  }

  const cantidad = tarjeta.querySelector("input[name='cantidad']");
  cantidad.max = String(Math.max(1, Math.min(MAX_POR_COMPRA, disponibles)));
  if (Number(cantidad.value) > Number(cantidad.max))
    cantidad.value = cantidad.max;
}

async function cargarFunciones() {
  const [giasCargadas, funciones] = await Promise.all([
    pedir("/api/travesias"),
    pedir("/api/funciones"),
  ]);
  giras = giasCargadas;
  llenarSelectGira();

  const ahora = Date.now();
  const visibles = funciones.filter(
    (f) => f.estado === "Programada" && new Date(f.fecha).getTime() > ahora,
  );

  if (visibles.length === 0) {
    listaFunciones.replaceChildren(
      el("p", "vacio", "No hay funciones a la venta por el momento."),
    );
  } else {
    listaFunciones.replaceChildren(...visibles.map(crearTarjeta));
  }
}

function llenarSelectGira() {
  if (!selectGira) return;
  const seleccionada = selectGira.value;

  selectGira.replaceChildren(
    ...giras.map((gira) => {
      const opcion = document.createElement("option");
      opcion.value = gira.id;
      opcion.textContent = nombreGira(gira);
      return opcion;
    }),
  );
  if (seleccionada) selectGira.value = seleccionada;
}

/* ---------- Mis entradas ---------- */

function crearEntrada(entrada) {
  const funcion = entrada.funcionId; // viene poblada con los datos de la función
  const nodo = el("article", "card entrada");

  const titulo = el("h2", "card-titulo", `${nombreGira(funcion?.giraId)} `);
  titulo.append(el("span", `badge ${entrada.estado}`, entrada.estado));
  nodo.append(titulo);

  if (funcion) {
    nodo.append(
      el("p", "", `📍 ${funcion.ciudad} · ${funcion.sala}`),
      el("p", "", `🗓️ ${formatoFecha.format(new Date(funcion.fecha))}`),
    );
  }

  const codigo = el("p", "codigo");
  codigo.append("Código: ", el("code", "", entrada.codigo));
  nodo.append(codigo);
  return nodo;
}

async function cargarMisEntradas() {
  const entradas = await pedir("/api/entradas/mias");

  if (entradas.length === 0) {
    listaEntradas.replaceChildren(
      el("p", "vacio", "Todavía no compraste entradas."),
    );
  } else {
    listaEntradas.replaceChildren(...entradas.map(crearEntrada));
  }
}

/* ---------- Eventos ---------- */

// Un solo listener para los botones de todas las tarjetas (delegación de eventos)
listaFunciones.addEventListener("click", async (evento) => {
  const boton = evento.target.closest("button[data-accion]");
  if (!boton) return;

  const tarjeta = boton.closest(".card");
  const cantidad = Number(
    tarjeta.querySelector("input[name='cantidad']").value,
  );
  const ruta =
    boton.dataset.accion === "fisica"
      ? "/api/entradas/fisica"
      : "/api/entradas";

  boton.disabled = true;
  try {
    const { mensaje: texto, disponibles } = await pedir(ruta, {
      method: "POST",
      body: JSON.stringify({ funcionId: tarjeta.dataset.id, cantidad }),
    });

    actualizarDisponibilidad(tarjeta, disponibles);
    mostrarMensaje(texto);
    if (boton.dataset.accion === "comprar") await cargarMisEntradas();
  } catch (error) {
    mostrarError(error);
    // Si la función cambió o se agotó mientras tanto, se refresca la lista
    if (error.status === 404 || error.status === 409) {
      cargarFunciones().catch(console.error);
    }
  } finally {
    if (tarjeta.isConnected && !tarjeta.classList.contains("agotada")) {
      boton.disabled = false;
    }
  }
});

formFuncion?.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const datos = Object.fromEntries(new FormData(formFuncion));
  datos.aforo = Number(datos.aforo);
  // El campo datetime-local trae hora local sin zona: se convierte a ISO (UTC) para el servidor.
  const fecha = new Date(datos.fecha);
  datos.fecha = Number.isNaN(fecha.getTime()) ? "" : fecha.toISOString();

  const boton = formFuncion.querySelector("button[type='submit']");
  boton.disabled = true;
  try {
    const { mensaje: texto } = await pedir("/api/funciones", {
      method: "POST",
      body: JSON.stringify(datos),
    });
    formFuncion.reset();
    await cargarFunciones();
    mostrarMensaje(texto);
  } catch (error) {
    mostrarError(error);
  } finally {
    boton.disabled = false;
  }
});

/* ---------- Tiempo real (Socket.IO) ---------- */

function marcarConexion(conectado) {
  estadoConexion.className = `estado-conexion ${conectado ? "en-vivo" : "desconectado"}`;
  estadoConexion.textContent = conectado ? "● En vivo" : "Sin conexión en vivo";
}

function iniciarTiempoReal() {
  // Si el script de Socket.IO no cargó, la página sigue funcionando sin actualización automática.
  if (typeof io === "undefined") return marcarConexion(false);

  const socket = io(); // envía la cookie de sesión: el servidor identifica al usuario

  socket.on("connect", () => marcarConexion(true));
  socket.on("disconnect", (motivo) => {
    marcarConexion(false);
    // El servidor corta el socket cuando vence la sesión (JWT)
    if (motivo === "io server disconnect") window.location.href = "/login";
  });
  socket.on("connect_error", (error) => {
    marcarConexion(false);
    if (error.message === "No autenticado") window.location.href = "/login";
  });

  // Alguien compró o vendió: se actualizan los disponibles sin recargar.
  socket.on("aforo:actualizado", ({ funcionId, disponibles, aforo }) => {
    const tarjeta = listaFunciones.querySelector(
      `.card[data-id="${CSS.escape(funcionId)}"]`,
    );
    if (tarjeta) actualizarDisponibilidad(tarjeta, disponibles, aforo);
  });

  // Se creó, editó o eliminó una gira o una función: se recarga la lista.
  socket.on("cartelera:cambio", () => cargarFunciones().catch(console.error));
}

iniciarTiempoReal();
Promise.all([cargarFunciones(), cargarMisEntradas()]).catch(mostrarError);
