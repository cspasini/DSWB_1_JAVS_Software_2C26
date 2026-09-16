// Importamos el modelo POO que creamos antes
const Gira = require('../models/Gira');

// 1. Controlador para listar todas las giras (Formato JSON)
exports.listarGiras = (req, res) => {
    try {
        const giras = Gira.obtenerTodas();
        res.json(giras);
    } catch (error) {
        res.status(500).json({ mensaje: "Error al obtener las Travesías Culturales" });
    }
};

// 2. Controlador para buscar una gira específica por ID (Uso de Ruta Dinámica)
exports.obtenerGiraPorId = (req, res) => {
    try {
        // Obtenemos el id directamente desde los parámetros de la URL dinámica
        const { id } = req.params; 
        
        // ¡AQUÍ ESTABA EL ERROR! (Debe estar todo junto: giraEncontrada)
        const giraEncontrada = Gira.obtenerPorId(id);

        if (!giraEncontrada) {
            return res.status(404).json({ mensaje: "La Travesía Cultural no existe" });
        }

        res.json(giraEncontrada);
    } catch (error) {
        res.status(500).json({ mensaje: "Error al procesar la solicitud" });
    }
};

// 3. Controlador para crear una nueva gira (Persistencia en JSON)
exports.crearGira = (req, res) => {
    try {
        const { id, artista, nombreTour, origen, destino, aforoTotal } = req.body;

        // Validación simple de datos obligatorios
        if (!id || !artista || !nombreTour || !origen || !destino || !aforoTotal) {
            return res.status(400).json({ mensaje: "Todos los campos son obligatorios" });
        }

        // Instanciamos el objeto usando la Clase POO de nuestro modelo
        const nuevaGira = new Gira(id, artista, nombreTour, origen, destino, aforoTotal);
        
        // Guardamos físicamente en el archivo JSON
        Gira.guardar(nuevaGira);

        res.status(201).json({
            mensaje: "¡Travesía Cultural confirmada y publicada en bloque con éxito!",
            gira: nuevaGira
        });
    } catch (error) {
        res.status(500).json({ mensaje: "Error al registrar la gira" });
    }
};
