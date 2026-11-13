// Igual que validarGira: solo pasan los campos permitidos (así nadie puede enviar "vendidas" por el body).
const CAMPOS_EDITABLES = [
  "ciudad",
  "sala",
  "fecha",
  "aforo",
  "estado",
  "aperturaAntesMin",
  "cierreDespuesMin",
];

const filtrarCampos = (campos) => (req, _res, next) => {
  const body = req.body ?? {};
  const datos = {};
  for (const campo of campos) {
    if (body[campo] !== undefined) datos[campo] = body[campo];
  }
  req.datosFuncion = datos;
  next();
};

// Al crear se indica a qué gira pertenece; al editar no se puede cambiar.
export const filtrarCamposFuncionNueva = filtrarCampos([
  "giraId",
  ...CAMPOS_EDITABLES,
]);
export const filtrarCamposFuncionEdicion = filtrarCampos(CAMPOS_EDITABLES);
