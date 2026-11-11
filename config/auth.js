// Parámetros de la autenticación, centralizados para ajustarlos sin tocar la lógica.
export const COOKIE_SESION = "urbana_token";
export const DURACION_SESION_MS = 60 * 60 * 1000; // 1 hora (el JWT vence al mismo tiempo que la cookie)

// Identifican quien emite el token y para quien es (si cambia, los tokens viejos no sirven)
export const JWT_ISSUER = "urbana-cult";
export const JWT_AUDIENCE = "urbana-cult-web";

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
