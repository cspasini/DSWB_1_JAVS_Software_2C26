// Parámetros de la sesión, centralizados para ajustarlos sin tocar la lógica.
export const COOKIE_SESION = "urbana_sid";
export const DURACION_SESION_MS = 8 * 60 * 60 * 1000; // 8 horas

// Atributos de la cookie de sesión:
//  - httpOnly: el JavaScript del navegador no puede leerla (frena el robo por XSS)
//  - sameSite 'lax': el navegador no la envía en pedidos POST iniciados desde otros sitios
//  - secure: solo viaja por HTTPS; se activa con NODE_ENV=production
export const opcionesCookie = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
});
