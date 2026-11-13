// Control de acceso: valida entradas en puerta (código escrito, lector o cámara) y muestra los ingresos en vivo.
// Todo el texto del servidor se inserta con textContent/append (nunca innerHTML), para evitar XSS.

const form = document.querySelector("#validar-form");
const campo = document.querySelector("#campo-codigo");
const resultado = document.querySelector("#resultado");
const listaIngresos = document.querySelector("#ingresos");
const estadoConexion = document.querySelector("#estado-conexion");
const btnCamara = document.querySelector("#btn-camara");
const visor = document.querySelector("#visor");
const video = document.querySelector("#video");

const formatoHora = new Intl.DateTimeFormat("es-AR", { timeStyle: "medium" });
const vistos = new Set(); // ingresos ya listados (evita duplicados entre la respuesta y el WebSocket)

function el(etiqueta, clase, texto) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

/* ---------- Acceso a la API ---------- */

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
    throw error;
  }
  return datos;
}

/* ---------- Resultado de la validación ---------- */

function mostrarResultado(tipo, titulo, ...lineas) {
  resultado.className = `resultado ${tipo}`;
  resultado.replaceChildren(
    el("strong", "resultado-titulo", titulo),
    ...lineas.map((linea) => el("p", "", linea)),
  );
  resultado.hidden = false;
}

async function validar(codigo) {
  const limpio = codigo.trim();
  if (!limpio) return;

  try {
    const datos = await pedir("/api/entradas/validar", {
      method: "POST",
      body: JSON.stringify({ codigo: limpio }),
    });
    mostrarResultado(
      "ok",
      "✔ Acceso permitido",
      `${datos.artista} — ${datos.nombreTour}`,
      `${datos.ciudad} · ${datos.sala}`,
      `Ingresaron ${datos.ingresaron} de ${datos.vendidas} entradas vendidas`,
    );
    agregarIngreso(datos);
  } catch (error) {
    console.error(error);
    if (error.status === undefined) {
      mostrarResultado(
        "error",
        "✖ No se pudo validar",
        "No se pudo conectar con el servidor",
      );
    } else {
      mostrarResultado("error", "✖ Acceso denegado", error.message);
    }
  }
}

/* ---------- Ingresos recientes ---------- */

function agregarIngreso(ingreso) {
  if (vistos.has(ingreso.entradaId)) return;
  vistos.add(ingreso.entradaId);

  listaIngresos.querySelector(".vacio")?.remove();

  const item = el("li", "ingreso");
  item.append(
    el("strong", "", `${formatoHora.format(new Date(ingreso.hora))} `),
    `${ingreso.artista} — ${ingreso.ciudad} · ${ingreso.sala} (${ingreso.canal}) · ` +
      `ingresaron ${ingreso.ingresaron} de ${ingreso.vendidas} · por ${ingreso.validador}`,
  );
  listaIngresos.prepend(item);

  // Solo se muestran los últimos 15
  while (listaIngresos.children.length > 15)
    listaIngresos.lastElementChild.remove();
}

/* ---------- Formulario (teclado o lector de códigos) ---------- */

// Un lector USB o Bluetooth "tipea" el código y envía Enter: llega por este mismo formulario.
form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const codigo = campo.value;
  campo.value = "";
  await validar(codigo);
  campo.focus();
});

/* ---------- Cámara (BarcodeDetector) ---------- */

let flujo = null;
let detector = null;
let ultimoCodigo = "";
let ultimaLectura = 0;

async function bucleEscaneo() {
  if (!flujo) return;

  try {
    const encontrados = await detector.detect(video);
    const valor = encontrados[0]?.rawValue;
    // El mismo QR frente a la cámara no se valida dos veces seguidas (pausa de 3 s)
    if (
      valor &&
      !(valor === ultimoCodigo && Date.now() - ultimaLectura < 3000)
    ) {
      ultimoCodigo = valor;
      ultimaLectura = Date.now();
      await validar(valor);
    }
  } catch (error) {
    console.error(error);
  }

  if (flujo) setTimeout(bucleEscaneo, 300);
}

async function iniciarCamara() {
  try {
    detector = new BarcodeDetector({ formats: ["qr_code"] });
    flujo = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    video.srcObject = flujo;
    await video.play();
    visor.hidden = false;
    btnCamara.textContent = "Detener cámara";
    bucleEscaneo();
  } catch (error) {
    console.error(error);
    detenerCamara();
    mostrarResultado(
      "error",
      "✖ No se pudo usar la cámara",
      "Revisá los permisos del navegador.",
    );
  }
}

function detenerCamara() {
  flujo?.getTracks().forEach((pista) => pista.stop());
  flujo = null;
  video.srcObject = null;
  visor.hidden = true;
  btnCamara.textContent = "Escanear con cámara";
}

// El botón solo aparece si el navegador sabe leer QR y tiene acceso a la cámara.
// (La cámara exige HTTPS o localhost; si no hay, queda el ingreso por teclado o lector.)
if ("BarcodeDetector" in window && navigator.mediaDevices?.getUserMedia) {
  btnCamara.hidden = false;
  btnCamara.addEventListener("click", () =>
    flujo ? detenerCamara() : iniciarCamara(),
  );
}
window.addEventListener("pagehide", detenerCamara);

/* ---------- Tiempo real (Socket.IO) ---------- */

function marcarConexion(conectado) {
  estadoConexion.className = `estado-conexion ${conectado ? "en-vivo" : "desconectado"}`;
  estadoConexion.textContent = conectado ? "● En vivo" : "Sin conexión en vivo";
}

function iniciarTiempoReal() {
  if (typeof io === "undefined") return marcarConexion(false);

  const socket = io();
  socket.on("connect", () => marcarConexion(true));
  socket.on("disconnect", (motivo) => {
    marcarConexion(false);
    if (motivo === "io server disconnect") window.location.href = "/login";
  });
  socket.on("connect_error", (error) => {
    marcarConexion(false);
    if (error.message === "No autenticado") window.location.href = "/login";
  });

  // Ingresos validados en cualquier puerta
  socket.on("entrada:validada", agregarIngreso);
}

iniciarTiempoReal();
