const express = require('express');
const router = express.Router();

// Importamos el controlador correspondiente
const giraController = require('../controllers/giraController');

// Ruta para obtener todas las giras (Método GET)
router.get('/travesias', giraController.listarGiras);

// RUTA DINÁMICA: El ':id' es un parámetro variable en la URL (Método GET)
router.get('/travesias/:id', giraController.obtenerGiraPorId);

// Ruta para dar de alta una nueva gira en la red de Urbana Cult (Método POST)
router.post('/travesias', giraController.crearGira);

module.exports = router;
