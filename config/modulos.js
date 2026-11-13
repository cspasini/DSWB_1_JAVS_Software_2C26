import { ROL } from "../utils/roles.js";
// Módulos de la plataforma que se muestran en el menú de inicio.
// Para habilitar uno más adelante: poner activo: true y completar su ruta.
export const modulos = [
  {
    id: "cartelera",
    icono: "🎭",
    nombre: "Cartelera de giras",
    descripcion:
      "Publicación, edición y consulta de las Travesías Culturales de la red.",
    ruta: "/cartelera",
    activo: true,
  },
  {
    id: "boleteria",
    icono: "🎟️",
    nombre: "Boletería e inventario único",
    descripcion:
      "Venta física y digital sincronizada en tiempo real para evitar la sobreventa.",
    ruta: "/boleteria",
    activo: true,
  },
  {
    id: "pagos",
    icono: "💳",
    nombre: "Pagos y liquidación",
    descripcion:
      "División automática de cada cobro entre artista, espacio y plataforma (split de pagos).",
    ruta: null,
    activo: false,
  },
  {
    id: "reprogramaciones",
    icono: "🔄",
    nombre: "Reprogramaciones",
    descripcion:
      "Cambios de fecha y cancelaciones con efecto en cascada sobre aforos, avisos y reembolsos.",
    ruta: null,
    activo: false,
  },
  {
    id: "usuarios",
    icono: "👥",
    nombre: "Administración de usuarios",
    descripcion:
      "Asignación de roles a las cuentas registradas en la plataforma.",
    ruta: "/admin/usuarios",
    activo: true,
    roles: [ROL.ADMIN], // solo lo ve (y puede entrar) el administrador
  },
  {
    id: "acceso",
    icono: "🚪",
    nombre: "Control de acceso",
    descripcion:
      "Validación de entradas en puerta con código QR y registro de ingresos en tiempo real.",
    ruta: "/acceso",
    activo: true,
    roles: [ROL.ADMIN, ROL.ESPACIO], // solo el personal lo ve (y puede entrar)
  },
  {
    id: "chat",
    icono: "💬",
    nombre: "Chat y asistente",
    descripcion:
      "Consultas en tiempo real sobre cada gira y asistente con IA para dudas de cartelera y compra.",
    ruta: "/chat",
    activo: true,
  },
];
