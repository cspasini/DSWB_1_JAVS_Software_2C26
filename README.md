# Urbana Cult — Cartelera de giras (v2)

Backend y front de la cartelera de "Travesías Culturales" de Urbana Cult.
Desarrollado por JAVS Software (Desarrollo Web Backend).

## Novedades de esta etapa

| Antes                               | Ahora                                                                         |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| CommonJS (`require`)                | **ES Modules** (`import` / `export`, `"type": "module"`)                      |
| Datos en archivos JSON              | **MongoDB con Mongoose** (Atlas o local)                                      |
| Código síncrono                     | **async/await** en controladores y servicios                                  |
| Vista solo de lectura               | **Front con `fetch`**: crear, editar y eliminar desde el navegador            |
| Sin seguridad                       | **Login usuario/contraseña con sesiones** y rutas protegidas                  |
| Se entraba escribiendo `/cartelera` | **Menú de inicio** con todos los módulos (los inactivos dicen "Próximamente") |

Todos los datos salen de la base de datos.

## Requisitos

- Node.js 20 o superior
- Una base MongoDB: Atlas o local (`mongodb://127.0.0.1:27017`)

## Puesta en marcha

1. Instalar dependencias:
   ```Terminal bash
   npm install
   ```
2. Crear el archivo `.env` a partir de `.env.example`:

   ```env
   PORT=3127
   MONGODB_URI=mongodb+srv://<usuario>:<clave>@<cluster>.mongodb.net/Urbana_Cult
   ```

   - La URI debe incluir el **nombre de la base** (`Urbana_Cult`) antes del `?`.
   - La colección la define el modelo `Gira`.
   - En Atlas hay que autorizar la IP en _Network Access_. Si la clave tiene caracteres especiales (`@ : / ?`), codificarlos.
   - El `.env` **no se sube a Git** (ya está en `.gitignore`).

3. Crear el primer usuario (sin esto no se puede ingresar):
   ```En la  terminal bash
   node scripts/crear-usuario.js <usuario> [rol]
   ```
   El rol por defecto es `admin` (también existe `editor`). La contraseña se pide por consola, esta oculta, por lo que no veras nada al escribir, la pide dos veces (mínimo 8 caracteres).
   Para cambiar la contraseña de un usuario existente: `node scripts/crear-usuario.js <usuario> --actualizar` (además cierra sus sesiones abiertas).
4. Iniciar:
   ```bash
   npm start        # producción
   node index.js   # desarrollo
   ```
5. Esperar que cargue,
   deberia mostrar:
   [JAVS] Conectado a MongoDB (base: Urbana_Cult)
   [JAVS] Servidor de Urbana Cult corriendo en http://localhost:3127
6. Abrir `http://localhost:3127` en el navegador.

## Cómo se usa

1. `/login`: ingreso con usuario y contraseña.
2. `/`: menú de inicio. Hoy solo la **Cartelera** está activa; Boletería, Pagos y Reprogramaciones figuran como "Próximamente" (se editan en `config/modulos.js`).
3. `/cartelera`: alta, edición y baja de travesías sin recargar la página. Arriba a la derecha se ve el usuario y el botón **Cerrar sesión**.

## API REST

Base: `/api`

| Método | Ruta             | Acceso     | Descripción                        |
| ------ | ---------------- | ---------- | ---------------------------------- |
| GET    | `/travesias`     | Público    | Lista las travesías                |
| GET    | `/travesias/:id` | Público    | Una travesía                       |
| POST   | `/travesias`     | Con sesión | Crea una travesía                  |
| PUT    | `/travesias/:id` | Con sesión | Edita una travesía                 |
| DELETE | `/travesias/:id` | Con sesión | Elimina una travesía               |
| POST   | `/auth/login`    | Público    | Inicia sesión (`usuario`, `clave`) |
| POST   | `/auth/logout`   | Público    | Cierra la sesión                   |

Campos de una travesía: `artista`, `nombreTour`, `origen`, `destino`, `aforoTotal` (entero ≥ 1) y `estado` (`Confirmada`, `Pendiente`, `Reprogramada`, `Cancelada`). Cualquier otro campo se ignora.

Códigos de error: `400` datos inválidos o id mal formado, `401` sin sesión, `404` no encontrado, `429` demasiados intentos de login, `500` error interno.

## Seguridad: qué hay y qué tener en cuenta

- **Contraseñas** guardadas con _scrypt_ (nunca en texto plano). Si cambian los parámetros, el hash se actualiza solo en el siguiente ingreso.
- **Sesión** con un token aleatorio en una cookie `urbana_sid` (`HttpOnly`, `SameSite=Lax`, 8 horas; `Secure` si `NODE_ENV=production`). En la base solo se guarda el hash del token y las sesiones vencidas se borran solas.
- **Login**: mensaje de error genérico ("Usuario o contraseña incorrectos") y bloqueo temporal tras 5 intentos fallidos desde la misma IP y usuario (15 minutos). El bloqueo vive en memoria: se reinicia con el servidor.
- **En producción**: usar HTTPS y `NODE_ENV=production` para que la cookie sea `Secure`.
- **Escalabilidad**: `middlewares/seguridad.js` separa _quién es_ el usuario (`identificarUsuario`) de _si puede entrar_ (`proteger` / `protegerPagina`). Tiene `aplicarSeguridad()` reservado para sumar `helmet`, `cors` o rate-limit, y cambiar el método de autenticación (JWT, OAuth, etc.) no obliga a tocar las rutas.
- **Front**: el texto que viene del servidor se inserta con `textContent`, nunca con `innerHTML`, para evitar XSS.
- Las credenciales se pasan por `fetch` (POST con JSON), nunca por la URL. El formulario de login tiene `method="post"` por si falla el JavaScript.

## Estructura

```
index.js              Arranque, middlewares y rutas
config/               db.js (conexión), auth.js (cookie), modulos.js (menú)
models/               Gira, Usuario, Sesion (Mongoose)
controllers/          giraController, authController
routes/               giraRoutes, authRoutes
middlewares/          seguridad, validarGira, errores
servicios/            sesiones.js
utils/                claves, cookies, limitadorLogin, consola
scripts/              crear-usuario.js (y seed opcional)
views/                login.pug, inicio.pug, listaGiras.pug
public/css, public/js Estilos y scripts del navegador (fetch)
```

## Problemas frecuentes encontrados

- **`ECONNREFUSED 127.0.0.1:27017`**: el servidor no leyó `MONGODB_URI` (revisar el nombre exacto en el `.env`) o no hay MongoDB local corriendo.
- **No conecta a Atlas**: revisar usuario y clave, _Network Access_ y que la URI termine en `/Urbana_Cult`.
- **`/cartelera` devuelve 500**: casi siempre es un error de sangría en un archivo `.pug`; el detalle sale en la terminal.
- **El login no avanza o la página queda sin estilos**: los CSS y JS deben estar en `public/css` y `public/js`. Un archivo faltante devuelve 404.
- **Cambios en el CSS no se ven**: recargar sin caché con Ctrl+F5.
- **Aparece una ruta `/favicon.ico` con 404**: es inofensivo.
