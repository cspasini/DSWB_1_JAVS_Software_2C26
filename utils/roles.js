// Roles del sistema, en un solo lugar. Usar siempre ROL.X en vez de strings sueltos. Esto permite cambiar los nombres de los roles en un solo lugar, y evita errores de tipeo.

export const ROL = Object.freeze({
  ADMIN: "admin", //Urbana cult: gestiona usuarios y todo el sistema. Puede crear y eliminar usuarios, y cambiar sus roles.
  ESPACIO: "espacio", //Representante de un espacio cultural, puede crear y editar sus espacios, y ver sus ventas.
  ARTISTA: "artista",
  PUBLICO: "publico", //rol por defecto al registrarse, puede ver los espacios y comprar entradas.
});
export const ROLES = Object.values(ROL);
