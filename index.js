const express = require('express');
const path = require('path'); // Módulo nativo para manejar rutas de carpetas
const app = express();
const PORT = 3127;

// Middleware para interpretar datos JSON
app.use(express.json());

// CONFIGURACIÓN DE PUG (Motor de plantillas)
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Importamos e integramos las rutas modulares
const giraRoutes = require('./routes/giraRoutes');
app.use('/api', giraRoutes);

// NUEVA RUTA DE VISTA: Renderiza las giras en la interfaz web de Pug
const Gira = require('./models/Gira');
app.get('/cartelera', (req, res) => {
    try {
        const todasLasGiras = Gira.obtenerTodas();
        // Renderiza el archivo 'listaGiras.pug' pasándole los datos de las travesías
        res.render('listaGiras', { giras: todasLasGiras });
    } catch (error) {
        res.status(500).send("Error al cargar la cartelera de Urbana Cult");
    }
});

// Ruta base de cortesía
app.get('/', (req, res) => {
    res.send("Servidor central de Urbana Cult - Desarrollado por JAVS Software");
});

// Iniciamos la escucha del servidor
app.listen(PORT, () => {
    console.log(`[JAVS] Servidor de Urbana Cult corriendo en http://localhost:${PORT}`);
});
